const ADJECTIVES_EN = [
  "happy", "sunny", "cozy", "lucky", "brave", "calm", "cool", "cute",
  "easy", "fair", "fast", "fine", "free", "glad", "gold", "good",
  "gray", "keen", "kind", "late", "lean", "live", "long", "loud",
  "main", "mild", "neat", "nice", "open", "pale", "pink", "pure",
  "rare", "real", "rich", "ripe", "safe", "slim", "slow", "soft",
  "sure", "tall", "tidy", "tiny", "true", "vast", "warm", "weak",
  "wide", "wild", "wise", "bold", "dark", "deep", "dull", "even",
  "flat", "full", "grim", "half", "hard", "high", "holy", "idle",
  "just", "last", "lazy", "left", "lost", "mere", "next", "only",
  "past", "plain", "poor", "proud", "quick", "quiet", "ready", "rough",
  "round", "royal", "sharp", "short", "shy", "sick", "sly", "small",
  "smooth", "sour", "spare", "steep", "stiff", "sweet", "thick", "tight",
  "tired", "tough", "upper", "vague",
]

const NOUNS_EN = [
  "apple", "beach", "bread", "candy", "chair", "cloud", "dance", "dream",
  "eagle", "feast", "flame", "fox", "grape", "heart", "house", "jewel",
  "lake", "lemon", "light", "lion", "maple", "marsh", "melon", "moon",
  "night", "ocean", "olive", "panda", "pearl", "plum", "porch", "queen",
  "raven", "river", "robin", "rose", "shell", "shore", "snake", "spark",
  "spoon", "stone", "storm", "sugar", "table", "tiger", "toast", "tower",
  "trail", "tulip", "vine", "whale", "wheel", "wolf", "brook", "cedar",
  "cliff", "crane", "daisy", "delta", "drift", "dune", "ember", "field",
  "finch", "frost", "glass", "grove", "haven", "hedge", "hill", "horn",
  "ivory", "jade", "kite", "knoll", "lane", "ledge", "lotus", "manor",
  "marsh", "oak", "orbit", "otter", "peak", "petal", "pond", "quail",
  "ridge", "sage", "seal", "slope", "solar", "swift", "thorn", "tide",
  "umber", "vale", "wren", "yarn", "zen", "birch",
]

// Swedish words — ö→o, ä→a, å→a for URL safety
const ADJECTIVES_SV = [
  "glad", "solig", "mysig", "modig", "lugn", "sval", "sot", "snabb",
  "ratt", "fri", "fin", "gyllen", "bra", "snal", "varm", "vild",
  "vis", "djup", "mjuk", "saker", "liten", "bred", "hog", "ren",
  "stor", "lang", "snall", "stark", "klok", "lat", "rask", "tam",
  "vass", "blank", "skarp", "slat", "tyst", "ljus", "mork", "rak",
  "flat", "full", "tom", "salt", "sur", "hal", "rund", "tunn",
  "tjock", "smal", "torr", "vat", "hel", "kal", "kall", "het",
  "mild", "hard", "stolt", "rar", "tuff", "trygg", "pigg", "flink",
]

const NOUNS_SV = [
  "apple", "strand", "brod", "stol", "moln", "dans", "drom", "orn",
  "fest", "laga", "rav", "druva", "hjarta", "hus", "sjo", "citron",
  "ljus", "lejon", "lonn", "melon", "mane", "natt", "hav", "oliv",
  "panda", "parla", "plommon", "ros", "snacka", "orm", "gnista", "sked",
  "sten", "storm", "socker", "bord", "tiger", "torn", "stig", "tulpan",
  "vina", "val", "hjul", "varg", "back", "bjork", "klippa", "trana",
  "falt", "fink", "frost", "glas", "lund", "hamn", "hage", "kulle",
  "horn", "jade", "drake", "ek", "utter", "topp", "damm", "vaktel",
  "as", "salvia", "sal", "slant", "torn", "tagg", "tid", "dal",
]

function secureRandom(max: number): number {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return array[0] % max
}

export function generateSlug(locale?: string): string {
  const adjectives = locale === "sv" ? ADJECTIVES_SV : ADJECTIVES_EN
  const nouns = locale === "sv" ? NOUNS_SV : NOUNS_EN
  const adj = adjectives[secureRandom(adjectives.length)]
  const noun = nouns[secureRandom(nouns.length)]
  return `${adj}-${noun}`
}

export function generateCode(): string {
  return String(100000 + secureRandom(900000))
}
