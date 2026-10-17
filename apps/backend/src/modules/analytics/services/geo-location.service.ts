import { Injectable, Logger } from '@nestjs/common';
import {
  EGYPT_GOVERNORATE_CODES,
  CITY_ARABIC_NAMES,
  COUNTRY_ARABIC_NAMES,
} from '../constants/geo-names.constants';

// Safe optional geoip loader to prevent build breaks if geoip-lite native types are omitted
let geoip: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  geoip = require('geoip-lite');
} catch {
  // Non-blocking fallback to Cloudflare/HTTP IP API
}

export interface ResolvedGeoLocation {
  country: string;
  city: string;
  countryCode: string;
}

@Injectable()
export class GeoLocationService {
  private readonly logger = new Logger(GeoLocationService.name);

  // In-memory cache for IP subnets (/24) to avoid repeated external queries
  private readonly ipSubnetCache = new Map<string, ResolvedGeoLocation>();

  // Reference exported constants for internal/public usage
  readonly EGYPT_GOVERNORATE_CODES = EGYPT_GOVERNORATE_CODES;
  readonly CITY_ARABIC_NAMES = CITY_ARABIC_NAMES;
  readonly COUNTRY_ARABIC_NAMES = COUNTRY_ARABIC_NAMES;

  /**
   * Resolves incoming IP address and proxy headers into normalized country and city.
   * Priority:
   * 1. Explicit Client-Side Geo Hint (if passed in body/headers)
   * 2. CDN/Reverse Proxy Region & City Headers (Cloudflare cf-region, cf-ipcity, etc.)
   * 3. In-memory Subnet Cache
   * 4. Offline GeoIP (MaxMind geoip-lite) Region & City
   * 5. Fast background / fallback lookup (NEVER defaulting blindly to Cairo)
   */
  public resolve(
    ipAddress?: string,
    headers: Record<string, any> = {},
    clientHint?: { city?: string; country?: string },
  ): ResolvedGeoLocation {
    const cleanIp = (ipAddress || '').replace(/^::ffff:/, '').trim();

    // 1. Client-Side Explicit Hint (from browser IP API / geolocation)
    if (clientHint?.city || clientHint?.country) {
      const country = clientHint.country ? this.localizeCountry(clientHint.country) : 'مصر';
      const city = clientHint.city ? this.localizeCity(clientHint.city) : '';
      if (city) {
        return { country, city, countryCode: 'EG' };
      }
    }

    // 2. Client header hints
    const headerCity = headers['x-client-city'] || headers['x-geo-city'];
    const headerCountry = headers['x-client-country'] || headers['x-geo-country'];
    if (headerCity) {
      const city = this.localizeCity(headerCity);
      const country = headerCountry ? this.localizeCountry(headerCountry) : 'مصر';
      return { country, city, countryCode: 'EG' };
    }

    // 3. Cloudflare & Vercel Headers
    const cfCountry = (headers['cf-ipcountry'] || headers['x-country-code'] || '').trim().toUpperCase();
    const cfRegionCode = (
      headers['cf-region-code'] ||
      headers['cf-region'] ||
      headers['x-vercel-ip-country-region'] ||
      ''
    ).trim().toLowerCase();
    const rawCityHeader = (headers['cf-ipcity'] || headers['x-vercel-ip-city'] || headers['x-city-name'] || '').trim();

    let cityHeader = '';
    if (rawCityHeader) {
      try {
        cityHeader = decodeURIComponent(rawCityHeader);
      } catch {
        cityHeader = rawCityHeader;
      }
    }

    // Check Egyptian region code first (e.g. 'dt' -> دمياط)
    const regionCity = this.EGYPT_GOVERNORATE_CODES[cfRegionCode] || '';
    const localizedCityHeader = this.localizeCity(cityHeader);
    const resolvedCity = localizedCityHeader || regionCity;

    if (cfCountry && cfCountry !== 'XX' && cfCountry !== 'T1') {
      const country = this.COUNTRY_ARABIC_NAMES[cfCountry] || cfCountry;
      let finalCity = resolvedCity;
      if (!finalCity) {
        if (cfCountry === 'EG') {
          finalCity = 'غير محدد';
        } else if (cfCountry === 'SG') {
          finalCity = 'سنغافورة';
        } else {
          finalCity = cityHeader || country;
        }
      }
      return { country, city: finalCity, countryCode: cfCountry };
    }

    // 4. Local/Private Subnet check
    if (this.isLocalOrPrivateIp(cleanIp)) {
      return {
        country: 'مصر',
        city: 'دمياط (محلي)',
        countryCode: 'EG',
      };
    }

    // 5. In-Memory Subnet Cache
    const subnetKey = cleanIp.split('.').slice(0, 3).join('.');
    if (this.ipSubnetCache.has(subnetKey)) {
      return this.ipSubnetCache.get(subnetKey)!;
    }

    // 6. MaxMind GeoIP Offline Lookup
    try {
      const geo = geoip ? geoip.lookup(cleanIp) : null;
      if (geo && geo.country) {
        const countryCode = geo.country.toUpperCase();
        const country = this.COUNTRY_ARABIC_NAMES[countryCode] || countryCode;
        const regionMatch = geo.region ? this.EGYPT_GOVERNORATE_CODES[geo.region.toLowerCase()] : '';
        const cityMatch = geo.city ? this.localizeCity(geo.city) : '';
        let detectedCity = cityMatch || regionMatch;
        if (!detectedCity) {
          if (countryCode === 'EG') {
            detectedCity = 'غير محدد';
          } else if (countryCode === 'SG') {
            detectedCity = 'سنغافورة';
          } else {
            detectedCity = (geo.city && this.localizeCity(geo.city)) || country;
          }
        }

        const result: ResolvedGeoLocation = {
          country,
          city: detectedCity,
          countryCode,
        };

        // Cache subnet
        if (subnetKey) {
          this.ipSubnetCache.set(subnetKey, result);
        }

        // Trigger background high-accuracy refresh for future requests if city was indeterminate
        if (detectedCity === 'غير محدد' && countryCode === 'EG') {
          void this.prefetchAccurateLocation(cleanIp, subnetKey);
        }

        return result;
      }
    } catch (err: any) {
      this.logger.debug(`GeoIP lookup error for ${cleanIp}: ${err?.message}`);
    }

    // 7. Background accurate resolution trigger
    void this.prefetchAccurateLocation(cleanIp, subnetKey);

    return {
      country: 'مصر',
      city: 'غير محدد',
      countryCode: 'EG',
    };
  }

  /**
   * Asynchronous resolution that awaits high-precision IP lookup if offline lookup
   * yielded indeterminate city for Egyptian IP ranges.
   */
  public async resolveAsync(
    ipAddress?: string,
    headers: Record<string, any> = {},
    clientHint?: { city?: string; country?: string },
  ): Promise<ResolvedGeoLocation> {
    const syncRes = this.resolve(ipAddress, headers, clientHint);
    if (syncRes.city !== 'غير محدد') {
      return syncRes;
    }

    const cleanIp = (ipAddress || '').replace(/^::ffff:/, '').trim();
    if (!cleanIp || this.isLocalOrPrivateIp(cleanIp)) {
      return syncRes;
    }

    const subnetKey = cleanIp.split('.').slice(0, 3).join('.');
    const accurate = await this.fetchAccurateLocation(cleanIp, subnetKey);
    return accurate || syncRes;
  }

  /**
   * Pre-fetches high accuracy governorate information via IP API
   * and populates the in-memory subnet cache so subsequent requests are instantly accurate.
   */
  public async fetchAccurateLocation(cleanIp: string, subnetKey: string): Promise<ResolvedGeoLocation | null> {
    if (!cleanIp || this.isLocalOrPrivateIp(cleanIp)) return null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      const res = await fetch(
        `http://ip-api.com/json/${cleanIp}?fields=status,country,countryCode,region,regionName,city`,
        { signal: controller.signal },
      );
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.status === 'success') {
          const country = this.COUNTRY_ARABIC_NAMES[data.countryCode] || data.country || 'مصر';
          const regionCode = (data.region || '').toLowerCase();
          const regionCity = this.EGYPT_GOVERNORATE_CODES[regionCode] || '';
          const cityFromCity = this.localizeCity(data.city);
          const cityFromRegion = this.localizeCity(data.regionName);
          let city = cityFromCity || cityFromRegion || regionCity;

          if (!city) {
            if (data.countryCode === 'EG') {
              city = 'غير محدد';
            } else if (data.countryCode === 'SG') {
              city = 'سنغافورة';
            } else {
              city = (data.city && this.localizeCity(data.city)) || data.regionName || country;
            }
          }

          const resolved: ResolvedGeoLocation = {
            country,
            city,
            countryCode: data.countryCode || 'EG',
          };

          if (subnetKey) {
            this.ipSubnetCache.set(subnetKey, resolved);
          }
          this.logger.debug(`[GeoCache] Cached accurate geo for ${subnetKey}: ${city}, ${country}`);
          return resolved;
        }
      }
    } catch {
      // Intentionally silent
    }
    return null;
  }

  private async prefetchAccurateLocation(cleanIp: string, subnetKey: string): Promise<void> {
    await this.fetchAccurateLocation(cleanIp, subnetKey);
  }

  /**
   * Localizes city or governorate into standardized Arabic text.
   */
  public localizeCity(cityText?: string): string {
    if (!cityText || !cityText.trim()) return '';
    const clean = cityText.trim().toLowerCase();

    if (this.CITY_ARABIC_NAMES[clean]) {
      return this.CITY_ARABIC_NAMES[clean];
    }

    // Partial search for governorates (e.g. "Damietta Governorate" -> "دمياط")
    for (const [key, arabic] of Object.entries(this.CITY_ARABIC_NAMES)) {
      if (clean.includes(key)) {
        return arabic;
      }
    }

    return cityText.trim();
  }

  /**
   * Localizes country name.
   */
  public localizeCountry(countryText?: string): string {
    if (!countryText || !countryText.trim()) return 'مصر';
    const clean = countryText.trim().toUpperCase();
    if (this.COUNTRY_ARABIC_NAMES[clean]) {
      return this.COUNTRY_ARABIC_NAMES[clean];
    }
    for (const [code, arabic] of Object.entries(this.COUNTRY_ARABIC_NAMES)) {
      if (clean.includes(code) || clean.includes(arabic.toUpperCase())) {
        return arabic;
      }
    }
    return countryText.trim();
  }

  /**
   * Checks if an IP address belongs to local or private subnet ranges.
   */
  public isLocalOrPrivateIp(ip: string): boolean {
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;
    if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('169.254.')) return true;
    if (ip.startsWith('172.')) {
      const secondOctet = parseInt(ip.split('.')[1], 10);
      if (secondOctet >= 16 && secondOctet <= 31) return true;
    }
    return false;
  }
}
