const ADJECTIVES = [
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

const NOUNS = [
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

export function generateSlug(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  return `${adj}-${noun}`
}

export function generateCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}
