const STORAGE_KEY = "golden-twin-demo-state";

const defaultRules = [
  "Stay inside the fenced yard unless the player unlocks a walk scene.",
  "Never accept harmful or unsafe requests; redirect into safe play or training.",
  "Treats are finite and only spent when inventory is available.",
  "High-energy actions are blocked when energy is low; rest first.",
  "Quest rewards require actual interaction progress, not random generation.",
];

const defaultState = {
  bond: 42,
  energy: 78,
  joy: 65,
  focus: 55,
  treats: 4,
  coins: 18,
  moodLabel: "Curious and friendly",
  emotionLabel: "Curious",
  relationshipLabel: "Trusted companion",
  location: "Sun deck",
  currentAction: "Idle scan",
  activeTask: {
    name: "Morning trust walk",
    description: "Win two praise interactions and one training cue.",
    praiseCount: 0,
    trainingCount: 0,
    completed: false,
  },
  memory: [
    {
      id: crypto.randomUUID(),
      kind: "boot",
      title: "Golden woke up in the yard",
      detail: "The demo session started with Golden scanning the fence and sun deck.",
      tags: ["startup", "home"],
      timestamp: new Date().toISOString(),
    },
  ],
  lastDecision: {
    provider: "Local ensemble",
    route: "Playmate",
    constraintStatus: "All clear",
    reply: "Golden is watching the yard, waiting for a cue from you.",
    plan: "Keep the bond warm, conserve energy, and stay inside the fenced yard.",
  },
  perception: {
    text: "No recent player text",
    voice: "Voice idle",
    vision: "No visual signals yet",
  },
  rules: defaultRules,
};

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function cloneDefaultState() {
  return structuredClone(defaultState);
}

export class GoldenStateStore {
  constructor() {
    this.state = this.#load();
  }

  #load() {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return cloneDefaultState();
    }

    try {
      return { ...cloneDefaultState(), ...JSON.parse(raw) };
    } catch (error) {
      console.warn("Failed to parse saved state, resetting.", error);
      return cloneDefaultState();
    }
  }

  save() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  reset() {
    this.state = cloneDefaultState();
    this.save();
  }

  snapshot() {
    return structuredClone(this.state);
  }

  setProviderLabel(providerLabel) {
    this.state.lastDecision.provider = providerLabel;
    this.save();
  }

  updatePerception(kind, detail, options = {}) {
    const { remember = true } = options;
    if (this.state.perception[kind] === detail) {
      return;
    }

    this.state.perception[kind] = detail;
    if (remember) {
      this.addMemory("perception", `${kind} update`, detail, [kind]);
    }
    this.save();
  }

  addMemory(kind, title, detail, tags = []) {
    this.state.memory.unshift({
      id: crypto.randomUUID(),
      kind,
      title,
      detail,
      tags,
      timestamp: new Date().toISOString(),
    });
    this.state.memory = this.state.memory.slice(0, 12);
  }

  applyDecision(decision) {
    this.state.bond = clamp(this.state.bond + (decision.effects?.bond ?? 0));
    this.state.energy = clamp(this.state.energy + (decision.effects?.energy ?? 0));
    this.state.joy = clamp(this.state.joy + (decision.effects?.joy ?? 0));
    this.state.focus = clamp(this.state.focus + (decision.effects?.focus ?? 0));
    this.state.treats = Math.max(0, this.state.treats + (decision.effects?.treats ?? 0));
    this.state.coins = Math.max(0, this.state.coins + (decision.effects?.coins ?? 0));
    this.state.location = decision.location ?? this.state.location;
    this.state.currentAction = decision.currentAction ?? this.state.currentAction;
    this.state.moodLabel = decision.moodLabel ?? this.state.moodLabel;
    this.state.emotionLabel = decision.emotionLabel ?? this.state.emotionLabel;
    this.state.relationshipLabel = relationshipLabelForBond(this.state.bond);

    if (decision.progress?.praise) {
      this.state.activeTask.praiseCount += decision.progress.praise;
    }
    if (decision.progress?.training) {
      this.state.activeTask.trainingCount += decision.progress.training;
    }

    if (
      this.state.activeTask.praiseCount >= 2 &&
      this.state.activeTask.trainingCount >= 1
    ) {
      this.state.activeTask.completed = true;
      this.state.activeTask.description = "Quest complete. Golden is ready for an afternoon trail unlock.";
    }

    this.state.lastDecision = {
      provider: decision.providerLabel,
      route: decision.routeLabel,
      constraintStatus: decision.constraintStatus,
      reply: decision.reply,
      plan: decision.plan,
    };

    if (decision.memory) {
      this.addMemory(decision.memory.kind, decision.memory.title, decision.memory.detail, decision.memory.tags);
    }

    this.save();
  }
}

function relationshipLabelForBond(bond) {
  if (bond >= 80) {
    return "Soul-bond sidekick";
  }
  if (bond >= 60) {
    return "Trusted companion";
  }
  if (bond >= 40) {
    return "Warmly familiar";
  }
  return "Still building trust";
}

export function formatTimestamp(iso) {
  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
  return formatter.format(new Date(iso));
}
