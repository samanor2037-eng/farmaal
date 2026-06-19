import type { Level } from '../types';

interface GroupTemplate {
  name: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  keysText: string;
  lowVocab: string[];
  medVocab: string[];
  highVocab: string[];
  baseWPM: number;
}

const templates: GroupTemplate[] = [
  {
    name: "Safka Dhexe ee Gacanta Bidix (Left Hand Home Row)",
    difficulty: "Beginner",
    keysText: "A, S, D, F",
    lowVocab: ["aas", "sad", "adaa"],
    medVocab: ["faas", "daas", "sada"],
    highVocab: ["asaf", "daasa", "faasa"],
    baseWPM: 10
  },
  {
    name: "Safka Dhexe ee Gacanta Midig (Right Hand Home Row)",
    difficulty: "Beginner",
    keysText: "J, K, L, ;",
    lowVocab: ["dal", "sal", "laas"],
    medVocab: ["kala", "daal", "kalka"],
    highVocab: ["kalkaal", "laasaha", "dalalka"],
    baseWPM: 13
  },
  {
    name: "Saf-dhexe ee badhamada G, H (Home Row Middle)",
    difficulty: "Beginner",
    keysText: "G, H",
    lowVocab: ["hal", "gal", "had"],
    medVocab: ["hadal", "dhag", "shaal"],
    highVocab: ["hadala", "dhagaha", "shaalalka"],
    baseWPM: 16
  },
  {
    name: "Safka Sare (Top Row)",
    difficulty: "Beginner",
    keysText: "Q, W, E, R, T, Y, U, I, O, P",
    lowVocab: ["qor", "eey", "oo"],
    medVocab: ["keen", "roob", "faro"],
    highVocab: ["hooyo", "geel", "weyn"],
    baseWPM: 20
  },
  {
    name: "Safka Hoose (Bottom Row)",
    difficulty: "Beginner",
    keysText: "Z, X, C, V, B, N, M",
    lowVocab: ["nin", "bad", "cag"],
    medVocab: ["aabe", "baro", "xamar"],
    highVocab: ["nabad", "macaan", "gacan"],
    baseWPM: 24
  },
  {
    name: "Maahmaahyo iyo Jumlado (Proverbs)",
    difficulty: "Intermediate",
    keysText: "Sentences",
    lowVocab: [
      "Far kaligeed fool ma dhaqdo.",
      "War la qabo xiiso ma leh.",
      "Hubsiimo hadal ma baajiso."
    ],
    medVocab: [
      "Aqoon la'aan waa iftiin la'aan.",
      "Aqli la'aantu waa cudur aan dawo lahayn.",
      "Nin aan dhul marin dhaqan ma barto."
    ],
    highVocab: [
      "Dhagax meel dhow buu ku dhacaa, dhawaaqna meel dheer.",
      "Nin faaraxay waa nin meel u baxay oo faraxsan.",
      "Geed walba in laga gooyo ayuu leeyahay oo dhib maleh."
    ],
    baseWPM: 30
  },
  {
    name: "Tirooyin iyo Xarakaad (Advanced)",
    difficulty: "Advanced",
    keysText: "Numbers & Symbols",
    lowVocab: [
      "Sanadkii 1960-kii ayay Soomaaliya heshay xorriyadeeda.",
      "Boqolkiiba 60% dadku waa beeralay iyo xoolaley."
    ],
    medVocab: [
      "Gobolka Geeska... Afrika wuxuu leeyahay taariikh qani ah, oo qiyaastii ah 3,000 sano.",
      "Qoraalkii Af-Soomaaliga waxaa si rasmi ah loo hirgeliyay sanadkii 1972."
    ],
    highVocab: [
      "Badda Soomaaliya waxay leeyahay dherer dhan 3,333 kiiloomitir, waana tan ugu dheer Afrika.",
      "Ku dhowaad 70% dadka Soomaaliyeed waxay da'doodu ka hooseysaa 30 sano."
    ],
    baseWPM: 40
  },
  {
    name: "Gabayo iyo Suugaan (Expert)",
    difficulty: "Expert",
    keysText: "Poetry",
    lowVocab: [
      "Dhoodimeer haddii aan fuulo, dhoolor-caddaan maayo.",
      "Dhabbi aan ku toosiyo jidka, dhibna aan ka reebo."
    ],
    medVocab: [
      "Xasanow dad waa wada dad oo laysma weyddiine, midna waa dawo.",
      "Midna waa cudur oo waa lagaa daadegayba e."
    ],
    highVocab: [
      "Laba kala dareen weyn, midna waa daryeel doon, midna waa dabraan doon.",
      "Maxamed Cabdulle Xasan wuxuu yidhi: \"Dalka keligay ma ihi.\""
    ],
    baseWPM: 50
  }
];

export const levels: Level[] = [];

// Generate 120 levels (15 per template, 8 templates)
templates.forEach((tmpl, groupIdx) => {
  for (let levelOffset = 1; levelOffset <= 15; levelOffset++) {
    const globalId = groupIdx * 15 + levelOffset;
    
    // Determine difficulty: 1,4,7,10,13 are Low; 2,5,8,11,14 are Medium; 3,6,9,12,15 are High
    let diffType: 'Low' | 'Medium' | 'High';
    let targetWPM: number;
    let text: string;
    let targetAccuracy: number;
    
    const cycle = (levelOffset - 1) % 3; // 0 for Low, 1 for Medium, 2 for High
    const cycleNum = Math.floor((levelOffset - 1) / 3); // 0 to 4
    
    if (cycle === 0) {
      diffType = 'Low';
      targetWPM = tmpl.baseWPM + cycleNum * 2;
      targetAccuracy = 90 + cycleNum;
    } else if (cycle === 1) {
      diffType = 'Medium';
      targetWPM = tmpl.baseWPM + 2 + cycleNum * 2;
      targetAccuracy = 91 + cycleNum;
    } else {
      diffType = 'High';
      targetWPM = tmpl.baseWPM + 4 + cycleNum * 2;
      targetAccuracy = 92 + cycleNum;
    }
    
    // Construct text based on difficulty
    if (tmpl.difficulty === 'Beginner') {
      const vocab = diffType === 'Low' ? tmpl.lowVocab : diffType === 'Medium' ? tmpl.medVocab : tmpl.highVocab;
      // Repeat words to create a realistic practice line
      const selectedWords: string[] = [];
      for (let i = 0; i < 4; i++) {
        selectedWords.push(vocab[(cycleNum + i) % vocab.length]);
      }
      text = selectedWords.join(' ');
    } else {
      // For sentence groups, just pick a sentence from the vocab
      const vocab = diffType === 'Low' ? tmpl.lowVocab : diffType === 'Medium' ? tmpl.medVocab : tmpl.highVocab;
      text = vocab[cycleNum % vocab.length];
    }
    
    levels.push({
      id: globalId,
      title: `${tmpl.name} [${diffType}]`,
      text,
      difficulty: tmpl.difficulty,
      targetWPM,
      targetAccuracy,
      description: `Tababarka furayaasha ${tmpl.keysText} ee heerka ${diffType}. Baro meelaynta farahaaga iyo xawaaraha qoraalka.`
    });
  }
});
