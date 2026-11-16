import { CommentItem, Episode, WebtoonSeries } from '../types';

const IMG_HERO_ANGKOR = '/src/assets/images/hero_angkor_fantasy_1794804089621.jpg';
const IMG_MONSOON_ROMANCE = '/src/assets/images/cover_monsoon_romance_1794804090527.jpg';
const IMG_SKY_LEAPER = '/src/assets/images/cover_phnom_penh_blade_1794804090579.jpg';
const IMG_LIBRARY_SHADOWS = '/src/assets/images/cover_lotus_mystery_1794804090854.jpg';
const IMG_SUNSET_NOODLES = '/src/assets/images/cover_street_food_slice_1794804091862.jpg';
const IMG_PANEL_SANCTUARY = '/src/assets/images/panel_temple_quest_1794804091900.jpg';

function buildEpisode(
  seriesId: string,
  epNum: number,
  titleKh: string,
  titleEn: string,
  dateKh: string,
  dateEn: string,
  likes: number,
  thumb: string,
  heroImg: string,
  theme: 'temple' | 'rain' | 'rooftop' | 'library' | 'noodle' | 'sanctuary',
  script: {
    narration1: { kh: string; en: string };
    line1: { speakerKh: string; speakerEn: string; kh: string; en: string };
    line2: { speakerKh: string; speakerEn: string; kh: string; en: string };
    line3: { speakerKh: string; speakerEn: string; kh: string; en: string };
    cliffhanger: { kh: string; en: string };
  },
): Episode {
  return {
    id: `${seriesId}-ep-${epNum}`,
    number: epNum,
    title: { kh: titleKh, en: titleEn },
    publishedDate: { kh: dateKh, en: dateEn },
    likes,
    thumbnailUrl: thumb,
    panels: [
      {
        id: `${seriesId}-ep-${epNum}-p1`,
        imageUrl: heroImg,
        sceneTheme: theme,
        caption: script.narration1,
        bubbles: [
          {
            id: 'b1',
            speaker: { kh: script.line1.speakerKh, en: script.line1.speakerEn },
            text: { kh: script.line1.kh, en: script.line1.en },
            position: 'bottom-left',
            variant: 'speech',
          },
        ],
      },
      {
        id: `${seriesId}-ep-${epNum}-p2`,
        sceneTheme: theme,
        bubbles: [
          {
            id: 'b2',
            speaker: { kh: script.line2.speakerKh, en: script.line2.speakerEn },
            text: { kh: script.line2.kh, en: script.line2.en },
            position: 'top-right',
            variant: 'speech',
          },
          {
            id: 'b3',
            text: {
              kh: 'សូមស្ដាប់សំឡេងខ្យល់បក់ឆ្លងកាត់ទីក្រុង...',
              en: 'Listen closely as the evening wind carries the truth...',
            },
            position: 'bottom-left',
            variant: 'thought',
          },
        ],
      },
      {
        id: `${seriesId}-ep-${epNum}-p3`,
        imageUrl: IMG_PANEL_SANCTUARY,
        sceneTheme: 'sanctuary',
        bubbles: [
          {
            id: 'b4',
            speaker: { kh: script.line3.speakerKh, en: script.line3.speakerEn },
            text: { kh: script.line3.kh, en: script.line3.en },
            position: 'top-left',
            variant: 'speech',
          },
        ],
      },
      {
        id: `${seriesId}-ep-${epNum}-p4`,
        sceneTheme: theme,
        caption: script.cliffhanger,
        bubbles: [
          {
            id: 'b5',
            text: { kh: 'ភាគបន្ទាប់នឹងបង្ហាញអាថ៌កំបាំង!', en: 'To be continued in the next episode.' },
            position: 'center',
            variant: 'narration',
          },
        ],
      },
    ],
  };
}

export const INITIAL_WEBTOONS: WebtoonSeries[] = [
  {
    id: 'guardians-of-angkor',
    title: { kh: 'អ្នកការពារប្រាសាទអង្គរ', en: 'Guardians of Angkor' },
    author: { kh: 'សុខ វិរៈ · K. Dara', en: 'Sok Vira · K. Dara' },
    genre: 'fantasy',
    scheduleDay: 'mon',
    isNew: true,
    coverUrl: IMG_HERO_ANGKOR,
    bannerUrl: IMG_HERO_ANGKOR,
    accentColor: '#00DC64',
    synopsis: {
      kh: 'នៅពេលចង្កៀងផ្កាឈូកបុរាណភ្លឺឡើងវិញលើប្រាសាទថ្មភក់ នារីអ្នកប្រាជ្ញវ័យក្មេង ទេវី ត្រូវដោះស្រាយអាថ៌កំបាំងសាស្ត្រាស្លឹករឹត ដើម្បីការពារព្រះរាជាណាចក្រពីស្រមោលងងឹត។',
      en: 'When luminous lotus lanterns awaken across mossy sandstone temples, young scholar-warrior Devi must unlock an ancient palm-leaf manuscript before the shadow seal shatters.',
    },
    viewsCount: 2_840_000,
    subscribersCount: 412_500,
    rating: 9.8,
    episodes: [
      buildEpisode(
        'guardians-of-angkor',
        1,
        'ចង្កៀងផ្កាឈូកភ្លឺឡើងវិញ',
        'Awakening of the Lotus Lanterns',
        '១២ វិច្ឆិកា ២០២៦',
        'Nov 12, 2026',
        48210,
        IMG_HERO_ANGKOR,
        IMG_HERO_ANGKOR,
        'temple',
        {
          narration1: {
            kh: 'ពេលថ្ងៃលិចលើកំពូលប្រាសាទបុរាណ ពន្លឺមាសបានបើកផ្លូវចូលទៅកាន់ប្រវត្តិសាស្ត្រដែលគេភ្លេច។',
            en: 'As dusk settles over the moss-draped towers, golden light reveals a forgotten seal.',
          },
          line1: {
            speakerKh: 'ទេវី',
            speakerEn: 'Devi',
            kh: 'ចង្កៀងទាំងនេះមិនមែនភ្លើងធម្មតាទេ... ទ្វារថ្មភក់កំពុងបើកហើយ!',
            en: 'These lotus flames are no illusion... the northern sanctuary gate is responding!',
          },
          line2: {
            speakerKh: 'មេត្តា',
            speakerEn: 'Metta',
            kh: 'ប្រយ័ត្ន! មានមនុស្សម្នាក់បានចូលមកដល់បន្ទប់សាស្ត្រាមុនពួកយើង។',
            en: 'Stay sharp! Someone entered the inner manuscript chamber ahead of us.',
          },
          line3: {
            speakerKh: 'ទេវី',
            speakerEn: 'Devi',
            kh: 'មើលទំព័រនេះចុះ! អក្សរចារឹកកំពុងប្រាប់ពីឈ្មោះអ្នកការពារទីប្រាំពីរ។',
            en: 'Look at this illuminated page! The ink is rewriting the name of the Seventh Guardian.',
          },
          cliffhanger: {
            kh: 'រំពេចនោះ សំឡេងជួងសំរិទ្ធបានលាន់ឮពីក្រោមដី...',
            en: 'Deep beneath the stone floor, a bronze bell begins to resonate...',
          },
        },
      ),
      buildEpisode(
        'guardians-of-angkor',
        2,
        'សាស្ត្រាស្លឹករឹតមាស',
        'The Golden Palm-Leaf Scroll',
        '១៤ វិច្ឆិកា ២០២៦',
        'Nov 14, 2026',
        39450,
        IMG_PANEL_SANCTUARY,
        IMG_PANEL_SANCTUARY,
        'sanctuary',
        {
          narration1: {
            kh: 'នៅក្នុងបន្ទប់បួងសួងបុរាណ ទៀនរាប់រយបានបំភ្លឺសិលាចារឹកសម្ងាត់។',
            en: 'Inside the candlelit sanctuary, ancient carvings shimmer across the altar.',
          },
          line1: {
            speakerKh: 'មេត្តា',
            speakerEn: 'Metta',
            kh: 'តើអ្នកអាចអានភាសាបុរាណនេះបានទេ ទេវី?',
            en: 'Can you decipher this archaic script before the candles burn out?',
          },
          line2: {
            speakerKh: 'ទេវី',
            speakerEn: 'Devi',
            kh: 'បាន... វានិយាយថា "ពន្លឺពិតមិនខ្លាចស្រមោលឡើយ"។',
            en: 'Yes... it reads: "True light never fears the encroaching dusk."',
          },
          line3: {
            speakerKh: 'សំឡេងអាថ៌កំបាំង',
            speakerEn: 'Sanctuary Voice',
            kh: 'អ្នកដែលកាន់ដាវស្មោះត្រង់ នឹងក្លាយជាស្ពានភ្ជាប់អតីតកាល និងបច្ចុប្បន្ន។',
            en: 'Whoever bears the honest blade shall bridge past and present.',
          },
          cliffhanger: {
            kh: 'ត្រៀមខ្លួនសម្រាប់ការប្រឈមនៅស្ពាននាគ!',
            en: 'Next: The trial at the Naga Causeway begins!',
          },
        },
      ),
      buildEpisode(
        'guardians-of-angkor',
        3,
        'ស្ពាននាគក្រោមពន្លឺចន្ទ',
        'Moonlit Naga Causeway',
        '១៥ វិច្ឆិកា ២០២៦',
        'Nov 15, 2026',
        35120,
        IMG_HERO_ANGKOR,
        IMG_HERO_ANGKOR,
        'temple',
        {
          narration1: {
            kh: 'អ័ព្ទសបានគ្របដណ្តប់លើគូទឹកជុំវិញប្រាសាទពេលកណ្តាលអធ្រាត្រ។',
            en: 'Silver mist drifts across the moat under the midnight crescent.',
          },
          line1: {
            speakerKh: 'ទេវី',
            speakerEn: 'Devi',
            kh: 'ពួកយើងត្រូវឆ្លងស្ពាននេះមុនព្រះអាទិត្យរះ។',
            en: 'We have to cross the causeway before first light breaks.',
          },
          line2: {
            speakerKh: 'មេត្តា',
            speakerEn: 'Metta',
            kh: 'មើលនោះ! ចម្លាក់នាគកំពុងបញ្ចេញពន្លឺបៃតង!',
            en: 'Look ahead! The stone Naga balustrades are glowing emerald!',
          },
          line3: {
            speakerKh: 'ទេវី',
            speakerEn: 'Devi',
            kh: 'កុំថយក្រោយ! ពន្លឺនោះកំពុងស្វាគមន៍ពួកយើង។',
            en: 'Hold steady—the ward recognizes the seal we carry.',
          },
          cliffhanger: {
            kh: 'ទ្វារព្រះអាទិត្យបានបើកឡើងយឺតៗ...',
            en: 'Slowly, the Gate of Dawn swings open...',
          },
        },
      ),
    ],
  },
  {
    id: 'golden-rain-love',
    title: { kh: 'ស្នេហាភ្លៀងមាស', en: 'Golden Rain Love' },
    author: { kh: 'ចាន់ ម៉ាលីស', en: 'Chan Malis' },
    genre: 'romance',
    scheduleDay: 'tue',
    isNew: true,
    coverUrl: IMG_MONSOON_ROMANCE,
    bannerUrl: IMG_MONSOON_ROMANCE,
    accentColor: '#E11D48',
    synopsis: {
      kh: 'រាល់រដូវវស្សានៅទីក្រុងភ្នំពេញ ដារ៉ា និង សុភ័ក្រ្ត តែងជួបគ្នាដោយចៃដន្យក្រោមឆ័ត្រថ្លាមួយ នៅលើវិថីដើមរាជព្រឹក្សពណ៌មាស។',
      en: 'Every monsoon evening in Phnom Penh, architecture student Malika and quiet violinist Rith share one transparent umbrella beneath blooming golden flame trees.',
    },
    viewsCount: 1_960_000,
    subscribersCount: 328_000,
    rating: 9.7,
    episodes: [
      buildEpisode(
        'golden-rain-love',
        1,
        'ឆ័ត្រថ្លាក្រោមដំណក់ភ្លៀង',
        'A Clear Umbrella in Evening Rain',
        '១១ វិច្ឆិកា ២០២៦',
        'Nov 11, 2026',
        41900,
        IMG_MONSOON_ROMANCE,
        IMG_MONSOON_ROMANCE,
        'rain',
        {
          narration1: {
            kh: 'មេឃចាប់ផ្តើមធ្លាក់ភ្លៀងរលឹមពេលថ្ងៃលិច ខណៈផ្កាពណ៌លឿងជ្រុះពេញផ្លូវ។',
            en: 'Warm sunset rain begins to fall, scattering golden blossoms across the avenue.',
          },
          line1: {
            speakerKh: 'រិទ្ធិ',
            speakerEn: 'Rith',
            kh: 'សុំទោស... ភ្លៀងខ្លាំងណាស់ ចូលមកជ្រកក្រោមឆ័ត្រជាមួយខ្ញុំសិនទៅ!',
            en: 'Wait—the downpour is picking up. Share my umbrella until the corner!',
          },
          line2: {
            speakerKh: 'ម៉ាលីកា',
            speakerEn: 'Malika',
            kh: 'អរគុណច្រើន! ខ្ញុំភ្លេចយកឆ័ត្រមកទៀតហើយថ្ងៃនេះ...',
            en: 'Thank you so much! I left mine at the studio again today...',
          },
          line3: {
            speakerKh: 'រិទ្ធិ',
            speakerEn: 'Rith',
            kh: 'មិនអីទេ បើដើរយឺតៗបែបនេះ ក៏ល្អម្យ៉ាងដែរ។',
            en: 'I do not mind at all. Walking slowly in this rain actually feels nice.',
          },
          cliffhanger: {
            kh: 'ស្នាមញញឹមមួយក្រោមភ្លើងផ្លូវពេលល្ងាច បានចាប់ផ្តើមរឿងរ៉ាវថ្មី។',
            en: 'A quiet smile beneath the streetlamps marks the start of something unforgettable.',
          },
        },
      ),
      buildEpisode(
        'golden-rain-love',
        2,
        'សំឡេងវីយូឡុងនៅហាងកាហ្វេ',
        'Violin Notes at the Corner Cafe',
        '១៣ វិច្ឆិកា ២០២៦',
        'Nov 13, 2026',
        33400,
        IMG_MONSOON_ROMANCE,
        IMG_MONSOON_ROMANCE,
        'rain',
        {
          narration1: {
            kh: 'ក្លិនកាហ្វេក្តៅ និងភ្លៀងត្រជាក់ បាននាំពួកគេជួបគ្នាម្តងទៀត។',
            en: 'Roasted coffee warmth meets cool evening rain as their paths cross again.',
          },
          line1: {
            speakerKh: 'ម៉ាលីកា',
            speakerEn: 'Malika',
            kh: 'បទភ្លេងមិញនេះ អ្នកនិពន្ធខ្លួនឯងមែនទេ?',
            en: 'That melody you were humming earlier—did you compose it yourself?',
          },
          line2: {
            speakerKh: 'រិទ្ធិ',
            speakerEn: 'Rith',
            kh: 'បាទ... ខ្ញុំដាក់ឈ្មោះថា "ភ្លៀងខែតុលា"។',
            en: 'Yes... I titled it "October Monsoon."',
          },
          line3: {
            speakerKh: 'ម៉ាលីកា',
            speakerEn: 'Malika',
            kh: 'ថ្ងៃស្អែក បើភ្លៀងទៀត ខ្ញុំចង់ស្តាប់ម្តងទៀតណាស់។',
            en: 'If it rains tomorrow evening, let me hear the rest of it.',
          },
          cliffhanger: {
            kh: 'បេះដូងលោតញាប់ជាងតំណក់ភ្លៀង...',
            en: 'A heartbeat louder than the falling rain...',
          },
        },
      ),
    ],
  },
  {
    id: 'sky-leaper',
    title: { kh: 'កំពូលអ្នកលោតលើមេឃ', en: 'Urban Fury: Sky Leaper' },
    author: { kh: 'វណ្ណា រតនា', en: 'Vanna Ratana' },
    genre: 'action',
    scheduleDay: 'wed',
    coverUrl: IMG_SKY_LEAPER,
    bannerUrl: IMG_SKY_LEAPER,
    accentColor: '#DC2626',
    synopsis: {
      kh: 'ក្នុងទីក្រុងដ៏មមាញឹកពេលរាត្រី យុវជនក្បាច់គុនល្បុក្កតោទំនើប កៃ ប្រើល្បឿនលើដំបូលអគារ ដើម្បីការពារសង្កាត់របស់ខ្លួនពីក្រុមលួចវត្ថុបុរាណ។',
      en: 'High above neon-lit city rooftops, modern martial artist Kai blends ancestral agility with parkour speed to stop an artifact smuggling syndicate.',
    },
    viewsCount: 3_150_000,
    subscribersCount: 489_000,
    rating: 9.9,
    episodes: [
      buildEpisode(
        'sky-leaper',
        1,
        'ជើងហោះលើដំបូលអគារ',
        'Midnight Rooftop Pursuit',
        '១០ វិច្ឆិកា ២០២៦',
        'Nov 10, 2026',
        56800,
        IMG_SKY_LEAPER,
        IMG_SKY_LEAPER,
        'rooftop',
        {
          narration1: {
            kh: 'ម៉ោង ១១:៤៥ យប់ — សញ្ញាអាសន្នពីសារមន្ទីរជាតិបានបន្លឺឡើង។',
            en: '11:45 PM — A silent alarm triggers above the downtown district.',
          },
          line1: {
            speakerKh: 'កៃ',
            speakerEn: 'Kai',
            kh: 'រត់មិនរួចទេ! ប្រគល់ប្រអប់វត្ថុបុរាណនោះមកវិញភ្លាម!',
            en: 'Nowhere left to run! Hand over the bronze relic case now!',
          },
          line2: {
            speakerKh: 'អ្នកនាំសារស្រមោល',
            speakerEn: 'Shadow Courier',
            kh: 'ក្មេងប្រុស! ឯងហ៊ានលោតឆ្លងគម្លាត ២០ ម៉ែត្រនេះមែនឬ?',
            en: 'Are you serious, kid? Nobody clears a twenty-meter gap in this wind!',
          },
          line3: {
            speakerKh: 'កៃ',
            speakerEn: 'Kai',
            kh: 'គ្រូខ្ញុំបង្រៀនថា ខ្យល់គឺជាជំហានទីមួយ!',
            en: 'My master taught me that the wind itself is just the first foothold!',
          },
          cliffhanger: {
            kh: 'កម្លាំងធាក់ដ៏ខ្លាំងបានបំបែកភាពស្ងៀមស្ងាត់លើមេឃ!',
            en: 'A thunderous leap shatters the midnight silence!',
          },
        },
      ),
      buildEpisode(
        'sky-leaper',
        2,
        'ក្បាច់គុនឥន្ទ្រីភ្លើង',
        'Crimson Hawk Strike',
        '១៤ វិច្ឆិកា ២០២៦',
        'Nov 14, 2026',
        44200,
        IMG_SKY_LEAPER,
        IMG_SKY_LEAPER,
        'rooftop',
        {
          narration1: {
            kh: 'លើស្ពានអាកាសដែក ការប្រឈមមុខដ៏តានតឹងបានចាប់ផ្តើម។',
            en: 'Atop the steel skybridge, the decisive clash erupts.',
          },
          line1: {
            speakerKh: 'កៃ',
            speakerEn: 'Kai',
            kh: 'ល្បឿនមិនមែនគ្រាន់តែរត់លឿនទេ... គឺការអានជំហានគូប្រកួត!',
            en: 'Speed is not just running fast—it is reading your rival before they move!',
          },
          line2: {
            speakerKh: 'មេក្រុមខ្មៅ',
            speakerEn: 'Syndicate Leader',
            kh: 'គួរឱ្យចាប់អារម្មណ៍ណាស់! យើងនឹងជួបគ្នាម្តងទៀតនៅកំពង់ផែ។',
            en: 'Impressive reflexes. Meet us at the river docks if you want the truth.',
          },
          line3: {
            speakerKh: 'កៃ',
            speakerEn: 'Kai',
            kh: 'ខ្ញុំនឹងទៅដល់ទីនោះមុនពេលពន្លឺថ្ងៃមកដល់!',
            en: 'Count on it. I will be there before sunrise.',
          },
          cliffhanger: {
            kh: 'តម្រុយថ្មីនៅកំពង់ផែទន្លេចតុមុខ!',
            en: 'Next stop: The four-rivers harbor!',
          },
        },
      ),
    ],
  },
  {
    id: 'library-of-shadows',
    title: { kh: 'បណ្ណាល័យស្រមោល', en: 'The Library of Shadows' },
    author: { kh: 'លីណា សេង', en: 'Lina Seng' },
    genre: 'mystery',
    scheduleDay: 'thu',
    coverUrl: IMG_LIBRARY_SHADOWS,
    bannerUrl: IMG_LIBRARY_SHADOWS,
    accentColor: '#D97706',
    synopsis: {
      kh: 'នារីអ្នកស៊ើបអង្កេតវ័យក្មេង កញ្ញា រស្មី រកឃើញបន្ទប់សម្ងាត់ក្រោមបណ្ណាល័យជាតិ ដែលសៀវភៅនីមួយៗកត់ត្រាការចងចាំដែលបាត់បង់របស់មនុស្ស។',
      en: 'Armed with a brass lantern and a battered notebook, archivist-detective Reasmey uncovers a hidden vault beneath the city library where forgotten memories are bound in leather.',
    },
    viewsCount: 1_420_000,
    subscribersCount: 245_000,
    rating: 9.6,
    episodes: [
      buildEpisode(
        'library-of-shadows',
        1,
        'ទូសៀវភៅលេខ ៤០៤',
        'Shelf Number 404',
        '១២ វិច្ឆិកា ២០២៦',
        'Nov 12, 2026',
        29800,
        IMG_LIBRARY_SHADOWS,
        IMG_LIBRARY_SHADOWS,
        'library',
        {
          narration1: {
            kh: 'ពន្លឺចង្កៀងប្រេងឆ្លុះបញ្ចាំងធូលីហោះក្នុងបណ្ណាល័យបុរាណម៉ោង ២ ទៀបភ្លឺ។',
            en: 'Brass lantern light cuts through drifting dust in the archive at 2:00 AM.',
          },
          line1: {
            speakerKh: 'រស្មី',
            speakerEn: 'Reasmey',
            kh: 'ក្នុងបញ្ជីមិនមានទូសៀវភៅលេខ ៤០៤ នេះទេ... ហេតុអ្វីទើបមានកំណត់ត្រាឈ្មោះខ្ញុំ?',
            en: 'Shelf 404 is not in the catalog... why is my own name written inside the spine?',
          },
          line2: {
            speakerKh: 'លោកគ្រូបណ្ណារក្ស',
            speakerEn: 'Head Archivist',
            kh: 'សៀវភៅណាដែលគ្មានអ្នកនិពន្ធ មិនគួរបើកអានពេលយប់ឡើយ។',
            en: 'Books without an author should never be opened after midnight.',
          },
          line3: {
            speakerKh: 'រស្មី',
            speakerEn: 'Reasmey',
            kh: 'ប៉ុន្តែទំព័រទីបីត្រូវបានគេហែកបាត់ទៅហើយ!',
            en: 'Too late—page three has already been torn out cleanly!',
          },
          cliffhanger: {
            kh: 'ស្នាមជើងថ្មីមួយលេចឡើងលើកម្រាលឈើ...',
            en: 'Fresh footprints appear along the wooden floorboards...',
          },
        },
      ),
    ],
  },
  {
    id: 'sunset-noodles',
    title: { kh: 'គុយទាវពេលថ្ងៃលិច', en: 'Sunset Noodles' },
    author: { kh: 'ប៊ុន ណារី', en: 'Bun Nary' },
    genre: 'slice_of_life',
    scheduleDay: 'fri',
    isNew: true,
    coverUrl: IMG_SUNSET_NOODLES,
    bannerUrl: IMG_SUNSET_NOODLES,
    accentColor: '#EA580C',
    synopsis: {
      kh: 'រទេះគុយទាវតូចមួយនៅមាត់ទន្លេរៀងរាល់ល្ងាច បើកទ្វារស្វាគមន៍អតិថិជនគ្រប់វ័យ ដែលមកចែករំលែករឿងរ៉ាវជីវិត និងភាពកក់ក្តៅតាមរយៈម្ហូបមួយចាន។',
      en: 'Every evening beside the riverfront, young chef Sreyneath serves steaming bowls of handmade noodles and warm listening ears to weary city souls.',
    },
    viewsCount: 1_780_000,
    subscribersCount: 310_400,
    rating: 9.8,
    episodes: [
      buildEpisode(
        'sunset-noodles',
        1,
        'ទឹកស៊ុបក្តៅសម្រាប់អ្នកដំណើរឆ្ងាយ',
        'Warm Broth for a Weary Traveler',
        '១៥ វិច្ឆិកា ២០២៦',
        'Nov 15, 2026',
        37600,
        IMG_SUNSET_NOODLES,
        IMG_SUNSET_NOODLES,
        'noodle',
        {
          narration1: {
            kh: 'គោមក្រដាសភ្លឺព្រោងព្រាតមាត់ទន្លេ ខណៈចំហាយទឹកស៊ុបហុយឡើងលើមេឃ។',
            en: 'Paper lanterns glow along the riverbank as fragrant steam rises into the twilight.',
          },
          line1: {
            speakerKh: 'ស្រីនាថ',
            speakerEn: 'Sreyneath',
            kh: 'សូមអញ្ជើញពិសា! គុយទាវសាច់គោពិសេសទើបលើកចេញពីឆ្នាំងក្តៅៗ!',
            en: 'Here you go! Freshly simmered riverside noodle soup, hot off the stove!',
          },
          line2: {
            speakerKh: 'ភ្ញៀវប្រចាំ',
            speakerEn: 'Regular Guest',
            kh: 'ក្លិនឈ្ងុយនេះធ្វើឱ្យខ្ញុំនឹកដល់ផ្ទះនៅខេត្តណាស់!',
            en: 'Just one spoonful of this broth reminds me of Sunday mornings back home.',
          },
          line3: {
            speakerKh: 'ស្រីនាថ',
            speakerEn: 'Sreyneath',
            kh: 'ញ៉ាំឱ្យឆ្អែតសិនទៅ! ថ្ងៃស្អែកក៏នៅមានរឿងល្អៗរង់ចាំដែរ។',
            en: 'Eat while it is steaming—tomorrow always feels lighter on a warm stomach.',
          },
          cliffhanger: {
            kh: 'រទេះមាត់ទន្លេបើករាល់ល្ងាចម៉ោង ៥!',
            en: 'Open every sunset at 5 PM along the riverfront!',
          },
        },
      ),
    ],
  },
  {
    id: 'mekong-chronicles',
    title: { kh: 'កំណត់ត្រាទន្លេមេគង្គ', en: 'Mekong Chronicles' },
    author: { kh: 'ពេជ្រ សុវណ្ណ', en: 'Pich Sovann' },
    genre: 'action',
    scheduleDay: 'sat',
    coverUrl: IMG_PANEL_SANCTUARY,
    bannerUrl: IMG_HERO_ANGKOR,
    accentColor: '#0EA5E9',
    synopsis: {
      kh: 'អ្នកនាំផ្លូវទូកវ័យក្មេងប្រមូលផ្តុំក្រុមអ្នកផ្សងព្រេងធ្វើដំណើរតាមដងទន្លេមេគង្គ ដើម្បីរុករកផែនទីបុរាណដែលបាត់បង់។',
      en: 'A fearless river navigator assembles an unlikely crew to chart forgotten islands and sunken stone temples along the Mekong.',
    },
    viewsCount: 980_000,
    subscribersCount: 164_000,
    rating: 9.4,
    episodes: [
      buildEpisode(
        'mekong-chronicles',
        1,
        'ផែនទីកោះអាថ៌កំបាំង',
        'Chart of the Sunken Island',
        '០៩ វិច្ឆិកា ២០២៦',
        'Nov 09, 2026',
        19200,
        IMG_PANEL_SANCTUARY,
        IMG_PANEL_SANCTUARY,
        'sanctuary',
        {
          narration1: {
            kh: 'ការធ្វើដំណើរតាមដងទន្លេចាប់ផ្តើមពីផែនទីចាស់មួយសន្លឹក។',
            en: 'Every great river voyage starts with one weather-worn parchment.',
          },
          line1: {
            speakerKh: 'សុវណ្ណ',
            speakerEn: 'Sovann',
            kh: 'ប្រសិនបើត្រីវិស័យនេះចង្អុលត្រឹមត្រូវ ពួកយើងនឹងឃើញកោះមុនថ្ងៃរះ។',
            en: 'If this brass compass holds true, the island rises at low tide.',
          },
          line2: {
            speakerKh: 'នីតា',
            speakerEn: 'Nita',
            kh: 'មើលទឹកទន្លេផ្លាស់ប្តូរពណ៌ទៅមុខនោះ!',
            en: 'Look ahead—the current is shifting color!',
          },
          line3: {
            speakerKh: 'សុវណ្ណ',
            speakerEn: 'Sovann',
            kh: 'ទាញក្តោងឡើង! ដំណើរផ្សងព្រេងចាប់ផ្តើមហើយ!',
            en: 'Hoist the sail! Our expedition officially begins!',
          },
          cliffhanger: {
            kh: 'កោះបុរាណលេចចេញពីអ័ព្ទពេលព្រឹក...',
            en: 'Ancient spires emerge through the morning mist...',
          },
        },
      ),
    ],
  },
  {
    id: 'midnight-pavilion',
    title: { kh: 'សាលាបុរាណកណ្តាលអធ្រាត្រ', en: 'Midnight Pavilion' },
    author: { kh: 'ហេង កល្យាណ', en: 'Heng Kalyana' },
    genre: 'horror',
    scheduleDay: 'sun',
    isCanvas: true,
    coverUrl: IMG_LIBRARY_SHADOWS,
    bannerUrl: IMG_LIBRARY_SHADOWS,
    accentColor: '#7C3AED',
    synopsis: {
      kh: 'រាល់ពេលនាឡិកាវាយម៉ោង ១២ យប់ អគារសិក្សាចាស់នៅជ្រុងវិទ្យាល័យតែងលេចឮសំឡេងហៅឈ្មោះសិស្សបាត់ខ្លួនកាលពីម្ភៃឆ្នាំមុន។',
      en: 'Whenever the school clock strikes twelve, the shuttered heritage wing echoes with whispers from a twenty-year-old disappearance.',
    },
    viewsCount: 640_000,
    subscribersCount: 112_000,
    rating: 9.3,
    episodes: [
      buildEpisode(
        'midnight-pavilion',
        1,
        'បន្ទប់រៀនដែលចាក់សោ',
        'The Locked Classroom',
        '០៨ វិច្ឆិកា ២០២៦',
        'Nov 08, 2026',
        14300,
        IMG_LIBRARY_SHADOWS,
        IMG_LIBRARY_SHADOWS,
        'library',
        {
          narration1: {
            kh: 'ភ្លៀងធ្លាក់ស្ងាត់ៗនៅមុខអគារសិក្សាចាស់។',
            en: 'Silence hangs heavy across the deserted school corridor.',
          },
          line1: {
            speakerKh: 'ដាវីន',
            speakerEn: 'Davin',
            kh: 'អ្នកណានៅខាងក្នុងបន្ទប់នោះ?',
            en: 'Is someone still inside room 3B?',
          },
          line2: {
            speakerKh: 'លក្ខិណា',
            speakerEn: 'Leakhena',
            kh: 'ទ្វារចាក់សោពីខាងក្នុង... ប៉ុន្តែមានសំឡេងដីសសរសេរលើក្តារខៀន!',
            en: 'The latch is bolted from within... yet chalk is scraping the blackboard!',
          },
          line3: {
            speakerKh: 'ដាវីន',
            speakerEn: 'Davin',
            kh: 'កុំរត់បំបែកគ្នា! បើកពិលឡើង!',
            en: 'Stay together! Keep your flashlight steady!',
          },
          cliffhanger: {
            kh: 'លើក្តារខៀនសរសេរថា៖ "សូមស្វាគមន៍ការត្រឡប់មកវិញ"...',
            en: 'Written on the chalkboard: "Welcome back to class"...',
          },
        },
      ),
    ],
  },
  {
    id: 'rice-field-promises',
    title: { kh: 'ពាក្យសន្យាវាលស្រែបៃតង', en: 'Promises of the Emerald Fields' },
    author: { kh: 'កែវ សុខុម', en: 'Keo Sokhom' },
    genre: 'romance',
    scheduleDay: 'completed',
    isCanvas: true,
    coverUrl: IMG_MONSOON_ROMANCE,
    bannerUrl: IMG_MONSOON_ROMANCE,
    accentColor: '#16A34A',
    synopsis: {
      kh: 'រឿងរ៉ាវស្នេហា និងក្តីស្រមៃរបស់យុវជនពីរនាក់នៅខេត្តបាត់ដំបង ដែលសន្យានឹងជួបគ្នាវិញក្រោយបញ្ចប់ការសិក្សានៅទីក្រុង។',
      en: 'A completed heartwarming tale of two childhood friends in Battambang who vow to reunite among the green rice fields after university.',
    },
    viewsCount: 2_120_000,
    subscribersCount: 375_000,
    rating: 9.7,
    episodes: [
      buildEpisode(
        'rice-field-promises',
        1,
        'រដូវច្រូតកាត់ចុងក្រោយ',
        'Last Harvest Before City Lights',
        '០១ វិច្ឆិកា ២០២៦',
        'Nov 01, 2026',
        31200,
        IMG_MONSOON_ROMANCE,
        IMG_MONSOON_ROMANCE,
        'rain',
        {
          narration1: {
            kh: 'ខ្យល់បក់ល្វើយៗលើវាលស្រែខៀវខ្ចីនាខែវិច្ឆិកា។',
            en: 'Cool November breeze ripples over emerald rice paddies at golden hour.',
          },
          line1: {
            speakerKh: 'សុខា',
            speakerEn: 'Sokha',
            kh: 'កុំភ្លេចផ្ញើសំបុត្រមកខ្ញុំរាល់ខែណា!',
            en: 'Promise you will write every month once you reach Phnom Penh!',
          },
          line2: {
            speakerKh: 'វិសាល',
            speakerEn: 'Visal',
            kh: 'ខ្ញុំនឹងត្រឡប់មកជាមួយសញ្ញាបត្រ និងផ្ការំដួលមួយទង!',
            en: 'I will return with my degree—and a fresh rumduol blossom!',
          },
          line3: {
            speakerKh: 'សុខា',
            speakerEn: 'Sokha',
            kh: 'ជួបគ្នានៅស្ថានីយរថភ្លើងបាត់ដំបង!',
            en: 'See you right back here at Battambang station!',
          },
          cliffhanger: {
            kh: 'រឿងរ៉ាវចប់ដោយស្នាមញញឹម និងក្តីសង្ឃឹម។',
            en: 'Completed Series · All chapters available to binge.',
          },
        },
      ),
    ],
  },
];

export const INITIAL_COMMENTS: Record<string, CommentItem[]> = {
  'guardians-of-angkor-ep-1': [
    {
      id: 'c1',
      author: 'Sophea_Art',
      timestamp: { kh: '២ ម៉ោងមុន', en: '2h ago' },
      text: 'គំនូរប្រាសាទស្អាតខ្លាំងណាស់! សាច់រឿងភាសាខ្មែរអានទៅរលូនមែនទែន 💚',
      likes: 142,
    },
    {
      id: 'c2',
      author: 'Rathana_K',
      timestamp: { kh: '៥ ម៉ោងមុន', en: '5h ago' },
      text: 'The lotus lantern artwork looks incredible! Switching between KH and ENG mid-chapter is so helpful.',
      likes: 89,
    },
  ],
  'golden-rain-love-ep-1': [
    {
      id: 'c3',
      author: 'MalisReader',
      timestamp: { kh: '១ ម៉ោងមុន', en: '1h ago' },
      text: 'ឈុតដើមរាជព្រឹក្សពណ៌មាស និងភ្លៀងរលឹមធ្វើឱ្យនឹកដល់ភ្នំពេញខ្លាំងណាស់!',
      likes: 118,
    },
  ],
};
