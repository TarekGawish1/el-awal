import { Injectable, Logger } from '@nestjs/common';
import * as geoip from 'geoip-lite';

export interface ResolvedGeoLocation {
  country: string;
  city: string;
  countryCode: string;
}

@Injectable()
export class GeoLocationService {
  private readonly logger = new Logger(GeoLocationService.name);

  // Common Country Code to Arabic label mapping
  private readonly COUNTRY_ARABIC_NAMES: Record<string, string> = {
    EG: 'مصر',
    SA: 'المملكة العربية السعودية',
    AE: 'الإمارات العربية المتحدة',
    KW: 'الكويت',
    QA: 'قطر',
    OM: 'سلطنة عمان',
    BH: 'البحرين',
    JO: 'الأردن',
    IQ: 'العراق',
    LB: 'لبنان',
    PS: 'فلسطين',
    SY: 'سوريا',
    YE: 'اليمن',
    LY: 'ليبيا',
    SD: 'السودان',
    DZ: 'الجزائر',
    TN: 'تونس',
    MA: 'المغرب',
    US: 'الولايات المتحدة',
    GB: 'المملكة المتحدة',
    DE: 'ألمانيا',
    FR: 'فرنسا',
    TR: 'تركيا',
    IT: 'إيطاليا',
    CA: 'كندا',
  };

  // Egyptian Governorates & Major Cities transliteration to Arabic
  private readonly CITY_ARABIC_NAMES: Record<string, string> = {
    cairo: 'القاهرة',
    alexandria: 'الإسكندرية',
    giza: 'الجيزة',
    mansoura: 'المنصورة',
    'el mansoura': 'المنصورة',
    dakahlia: 'المنصورة / الدقهلية',
    damietta: 'دمياط',
    tanta: 'طنطا',
    gharbia: 'طنطا / الغربية',
    zagazig: 'الزقازيق',
    sharqia: 'الشرقية',
    banha: 'بنها',
    qalyubia: 'القليوبية',
    'shibin el kom': 'شبين الكوم',
    monufia: 'المنوفية',
    'port said': 'بورسعيد',
    suez: 'السويس',
    ismailia: 'الإسماعيلية',
    fayoum: 'الفيوم',
    faiyum: 'الفيوم',
    'beni suef': 'بني سويف',
    minya: 'المنيا',
    asyut: 'أسيوط',
    sohag: 'سوهاج',
    qena: 'قنا',
    luxor: 'الأقصر',
    aswan: 'أسوان',
    hurghada: 'الغردقة',
    'red sea': 'البحر الأحمر',
    matrouh: 'مطروح',
    'marsa matruh': 'مرسى مطروح',
    arish: 'العريش',
    'north sinai': 'شمال سيناء',
    'sharm el sheikh': 'شرم الشيخ',
    'south sinai': 'جنوب سيناء',
    'kafr el sheikh': 'كفر الشيخ',
    damanhur: 'دمنهور',
    beheira: 'البحيرة',
    riyadh: 'الرياض',
    jeddah: 'جدة',
    dammam: 'الدمام',
    dubai: 'دبي',
    'abu dhabi': 'أبوظبي',
    kuwait: 'مدينة الكويت',
  };

  /**
   * Resolves incoming IP address and proxy headers into normalized country and city.
   */
  public resolve(
    ipAddress?: string,
    headers: Record<string, any> = {},
  ): ResolvedGeoLocation {
    const cleanIp = (ipAddress || '').replace(/^::ffff:/, '').trim();

    // 1. Check Cloudflare / CDN headers
    const cfCountry = (headers['cf-ipcountry'] || headers['x-country-code'] || '').trim().toUpperCase();
    const rawCityHeader = (headers['cf-ipcity'] || headers['x-city-name'] || '').trim();

    let cityHeader = '';
    if (rawCityHeader) {
      try {
        cityHeader = decodeURIComponent(rawCityHeader);
      } catch {
        cityHeader = rawCityHeader;
      }
    }

    if (cfCountry && cfCountry !== 'XX' && cfCountry !== 'T1') {
      const country = this.COUNTRY_ARABIC_NAMES[cfCountry] || cfCountry;
      const city = this.localizeCity(cityHeader) || (cfCountry === 'EG' ? 'القاهرة' : 'عام');
      return { country, city, countryCode: cfCountry };
    }

    // 2. Local/Private IP Detection
    if (this.isLocalOrPrivateIp(cleanIp)) {
      return {
        country: 'مصر',
        city: 'القاهرة',
        countryCode: 'EG',
      };
    }

    // 3. Fallback to MaxMind GeoIP lookup (offline, in-memory)
    try {
      const geo = geoip.lookup(cleanIp);
      if (geo && geo.country) {
        const countryCode = geo.country.toUpperCase();
        const country = this.COUNTRY_ARABIC_NAMES[countryCode] || countryCode;
        const rawCity = geo.city || '';
        const city = this.localizeCity(rawCity) || (countryCode === 'EG' ? 'القاهرة' : 'عام');
        return { country, city, countryCode };
      }
    } catch (err: any) {
      this.logger.debug(`GeoIP lookup error for ${cleanIp}: ${err?.message}`);
    }

    // 4. Default graceful fallback
    return {
      country: 'مصر',
      city: 'القاهرة',
      countryCode: 'EG',
    };
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
    // Partial search for governorates
    for (const [key, arabic] of Object.entries(this.CITY_ARABIC_NAMES)) {
      if (clean.includes(key)) {
        return arabic;
      }
    }
    return cityText.trim();
  }

  /**
   * Checks if an IP address belongs to local or private subnet ranges.
   */
  private isLocalOrPrivateIp(ip: string): boolean {
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;
    if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('169.254.')) return true;
    if (ip.startsWith('172.')) {
      const secondOctet = parseInt(ip.split('.')[1], 10);
      if (secondOctet >= 16 && secondOctet <= 31) return true;
    }
    return false;
  }
}
