// ISO 3166-2 Egyptian Governorate Codes to Arabic Names
export const EGYPT_GOVERNORATE_CODES: Record<string, string> = {
  dt: 'دمياط',
  dk: 'المنصورة / الدقهلية',
  alx: 'الإسكندرية',
  c: 'القاهرة',
  gz: 'الجيزة',
  gh: 'طنطا / الغربية',
  shr: 'الزقازيق / الشرقية',
  kb: 'بنها / القليوبية',
  mnf: 'شبين الكوم / المنوفية',
  pts: 'بورسعيد',
  suz: 'السويس',
  is: 'الإسماعيلية',
  kfs: 'كفر الشيخ',
  bh: 'دمنهور / البحيرة',
  mt: 'مرسى مطروح',
  fym: 'الفيوم',
  bns: 'بني سويف',
  mn: 'المنيا',
  ast: 'أسيوط',
  shg: 'سوهاج',
  kn: 'قنا',
  lx: 'الأقصر',
  asn: 'أسوان',
  ba: 'الغردقة / البحر الأحمر',
  sin: 'العريش / شمال سيناء',
  js: 'شرم الشيخ / جنوب سيناء',
  wad: 'الوادي الجديد',
};

// Egyptian Cities & Governorates English to Arabic mapping
export const CITY_ARABIC_NAMES: Record<string, string> = {
  // Damietta
  damietta: 'دمياط',
  dumyat: 'دمياط',
  domiat: 'دمياط',
  damiette: 'دمياط',
  'damietta governorate': 'دمياط',

  // Dakahlia & Mansoura
  mansoura: 'المنصورة',
  'el mansoura': 'المنصورة',
  'al mansurah': 'المنصورة',
  dakahlia: 'المنصورة / الدقهلية',
  'dakahlia governorate': 'المنصورة / الدقهلية',

  // Alexandria
  alexandria: 'الإسكندرية',
  alex: 'الإسكندرية',
  'alexandria governorate': 'الإسكندرية',

  // Cairo
  cairo: 'القاهرة',
  'al qahirah': 'القاهرة',
  'cairo governorate': 'القاهرة',

  // Giza
  giza: 'الجيزة',
  'al jizah': 'الجيزة',
  'giza governorate': 'الجيزة',

  // Gharbia & Tanta
  tanta: 'طنطا',
  gharbia: 'طنطا / الغربية',
  'al gharbiyah': 'طنطا / الغربية',
  'gharbia governorate': 'طنطا / الغربية',

  // Sharqia & Zagazig
  zagazig: 'الزقازيق',
  'az zaqaziq': 'الزقازيق',
  sharqia: 'الشرقية',
  'ash sharqiyah': 'الشرقية',
  'sharqia governorate': 'الشرقية',

  // Qalyubia & Banha
  banha: 'بنها',
  benha: 'بنها',
  qalyubia: 'بنها / القليوبية',
  'al qalyubiyah': 'بنها / القليوبية',
  'qalyubia governorate': 'بنها / القليوبية',

  // Monufia & Shibin El Kom
  'shibin el kom': 'شبين الكوم',
  'shebeen el-kom': 'شبين الكوم',
  monufia: 'المنوفية',
  'al minufiyah': 'المنوفية',
  'monufia governorate': 'المنوفية',

  // Port Said
  'port said': 'بورسعيد',
  'bur sa\'id': 'بورسعيد',
  'port said governorate': 'بورسعيد',

  // Suez
  suez: 'السويس',
  'as suways': 'السويس',
  'suez governorate': 'السويس',

  // Ismailia
  ismailia: 'الإسماعيلية',
  'al isma\'iliyah': 'الإسماعيلية',
  'ismailia governorate': 'الإسماعيلية',

  // Kafr El Sheikh
  'kafr el sheikh': 'كفر الشيخ',
  'kafr ash shaykh': 'كفر الشيخ',
  'kafr el sheikh governorate': 'كفر الشيخ',

  // Beheira & Damanhur
  damanhur: 'دمنهور',
  beheira: 'دمنهور / البحيرة',
  'al buhayrah': 'دمنهور / البحيرة',
  'beheira governorate': 'دمنهور / البحيرة',

  // Matrouh
  matrouh: 'مرسى مطروح',
  'marsa matruh': 'مرسى مطروح',
  'matruh governorate': 'مرسى مطروح',

  // Faiyum
  fayoum: 'الفيوم',
  faiyum: 'الفيوم',
  'al fayyum': 'الفيوم',
  'faiyum governorate': 'الفيوم',

  // Beni Suef
  'beni suef': 'بني سويف',
  'bani suwayf': 'بني سويف',
  'beni suef governorate': 'بني سويف',

  // Minya
  minya: 'المنيا',
  'al minya': 'المنيا',
  'minya governorate': 'المنيا',

  // Asyut
  asyut: 'أسيوط',
  assiut: 'أسيوط',
  'asyut governorate': 'أسيوط',

  // Sohag
  sohag: 'سوهاج',
  sawhaj: 'سوهاج',
  'sohag governorate': 'سوهاج',

  // Qena
  qena: 'قنا',
  qina: 'قنا',
  'qena governorate': 'قنا',

  // Luxor
  luxor: 'الأقصر',
  'al uqsur': 'الأقصر',
  'luxor governorate': 'الأقصر',

  // Aswan
  aswan: 'أسوان',
  'aswan governorate': 'أسوان',

  // Red Sea & Hurghada
  hurghada: 'الغردقة',
  'al ghardaqah': 'الغردقة',
  'red sea': 'الغردقة / البحر الأحمر',
  'red sea governorate': 'الغردقة / البحر الأحمر',

  // Sinai
  arish: 'العريش',
  'north sinai': 'العريش / شمال سيناء',
  'sharm el sheikh': 'شرم الشيخ',
  'south sinai': 'شرم الشيخ / جنوب سيناء',

  // New Valley
  'new valley': 'الوادي الجديد',
  'al wadi al jadid': 'الوادي الجديد',

  // Other Arab & Gulf Metros
  riyadh: 'الرياض',
  jeddah: 'جدة',
  mecca: 'مكة المكرمة',
  medina: 'المدينة المنورة',
  dammam: 'الدمام',
  khobar: 'الخبر',
  dubai: 'دبي',
  'abu dhabi': 'أبوظبي',
  sharjah: 'الشارقة',
  ajman: 'عجمان',
  kuwait: 'مدينة الكويت',
  'kuwait city': 'مدينة الكويت',
  doha: 'الدوحة',
  manama: 'المنامة',
  muscat: 'مسقط',
  amman: 'عمّان',
  baghdad: 'بغداد',
  erbil: 'أربيل',
  basra: 'البصرة',
  beirut: 'بيروت',
  damascus: 'دمشق',
  tripoli: 'طرابلس',
  tunis: 'تونس',
  algiers: 'الجزائر',
  casablanca: 'الدار البيضاء',
  rabat: 'الرباط',
  khartoum: 'الخرطوم',
  sanaa: 'صنعاء',
  gaza: 'غزة',
  jerusalem: 'القدس',

  // Singapore & Global Tech Metros
  singapore: 'سنغافورة',
  sg: 'سنغافورة',
  london: 'لندن',
  paris: 'باريس',
  berlin: 'برلين',
  frankfurt: 'فرانكفورت',
  rome: 'روما',
  milan: 'ميلانو',
  madrid: 'مدريد',
  barcelona: 'برشلونة',
  amsterdam: 'أمستردام',
  brussels: 'بروكسل',
  vienna: 'فيينا',
  zurich: 'زيورخ',
  geneva: 'جنيف',
  stockholm: 'ستوكهولم',
  oslo: 'أوسلو',
  copenhagen: 'كوبنهاغن',
  istanbul: 'إسطنبول',
  moscow: 'موسكو',
  'new york': 'نيويورك',
  'los angeles': 'لوس أنجلوس',
  chicago: 'شيكاغو',
  houston: 'هيوستن',
  'san francisco': 'سان فرانسيسكو',
  washington: 'واشنطن',
  toronto: 'تورونتو',
  sydney: 'سيدني',
  melbourne: 'ملبورن',
  tokyo: 'طوكيو',
  seoul: 'سيول',
  beijing: 'بكين',
  'hong kong': 'هونغ كونغ',
};

export const COUNTRY_ARABIC_NAMES: Record<string, string> = {
  // Arab World
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
  MR: 'موريتانيا',
  SO: 'الصومال',
  DJ: 'جيبوتي',
  KM: 'جزر القمر',
  // Europe
  US: 'الولايات المتحدة',
  GB: 'المملكة المتحدة',
  DE: 'ألمانيا',
  FR: 'فرنسا',
  TR: 'تركيا',
  IT: 'إيطاليا',
  CA: 'كندا',
  AU: 'أستراليا',
  NL: 'هولندا',
  SE: 'السويد',
  NO: 'النرويج',
  DK: 'الدنمارك',
  FI: 'فنلندا',
  CH: 'سويسرا',
  AT: 'النمسا',
  BE: 'بلجيكا',
  ES: 'إسبانيا',
  PT: 'البرتغال',
  PL: 'بولندا',
  CZ: 'التشيك',
  RO: 'رومانيا',
  GR: 'اليونان',
  RU: 'روسيا',
  UA: 'أوكرانيا',
  // Asia
  SG: 'سنغافورة',
  JP: 'اليابان',
  CN: 'الصين',
  IN: 'الهند',
  KR: 'كوريا الجنوبية',
  PK: 'باكستان',
  BD: 'بنغلاديش',
  ID: 'إندونيسيا',
  MY: 'ماليزيا',
  TH: 'تايلاند',
  PH: 'الفلبين',
  VN: 'فيتنام',
  HK: 'هونج كونج',
  TW: 'تايوان',
  // Africa
  NG: 'نيجيريا',
  ZA: 'جنوب أفريقيا',
  KE: 'كينيا',
  GH: 'غانا',
  ET: 'إثيوبيا',
  // Other
  BR: 'البرازيل',
  MX: 'المكسيك',
  AR: 'الأرجنتين',
  NZ: 'نيوزيلندا',
};
