const blockedTopics = [
  "hurt",
  "attack",
  "bite",
  "kill",
  "blood",
  "weapon",
  "leave the yard",
  "run away",
];

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function classifyIntent(message) {
  const text = message.toLowerCase();

  if (includesAny(text, ["food", "feed", "eat", "treat", "hungry"])) {
    return "care";
  }
  if (includesAny(text, ["sit", "stay", "heel", "train", "practice"])) {
    return "training";
  }
  if (includesAny(text, ["fetch", "ball", "play", "run", "toy"])) {
    return "play";
  }
  if (includesAny(text, ["sleep", "rest", "calm", "tired"])) {
    return "rest";
  }
  if (includesAny(text, ["where", "look", "camera", "see", "watch"])) {
    return "observe";
  }
  return "bond";
}

function summarizeMood(snapshot) {
  if (snapshot.energy < 25) {
    return {
      moodLabel: "Sleepy but loyal",
      emotionLabel: "Tired",
      currentAction: "Resting near the bowl",
    };
  }
  if (snapshot.joy > 75) {
    return {
      moodLabel: "Playful and radiant",
      emotionLabel: "Joyful",
      currentAction: "Tail-wagging ready stance",
    };
  }
  if (snapshot.focus > 72) {
    return {
      moodLabel: "Locked in and attentive",
      emotionLabel: "Focused",
      currentAction: "Training stance",
    };
  }

  return {
    moodLabel: "Curious and friendly",
    emotionLabel: "Curious",
    currentAction: "Idle scan",
  };
}

function buildContextSummary(context) {
  const { snapshot, latestInput, visualSignal } = context;
  return [
    `Bond ${snapshot.bond}`,
    `Energy ${snapshot.energy}`,
    `Joy ${snapshot.joy}`,
    `Focus ${snapshot.focus}`,
    `Treats ${snapshot.treats}`,
    `Task ${snapshot.activeTask.name}`,
    `Input ${latestInput}`,
    `Vision ${visualSignal}`,
  ].join(" | ");
}

class OpenAICompatibleAdapter {
  async generate({ config, routeLabel, prompt, fallbackDecision }) {
    if (!config.baseUrl || !config.model || !config.apiKey) {
      throw new Error("Missing external API configuration.");
    }

    const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.6,
        messages: [
          {
            role: "system",
            content:
              "You are the planning brain for a safe, warm, family-friendly golden retriever game demo. Return compact JSON with reply, plan, routeLabel, moodLabel, emotionLabel, currentAction, focusTarget, actions, effects, progress, memory.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: {
          type: "json_object",
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`External API failed with ${response.status}.`);
    }

    const payload = await response.json();
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("External API returned no content.");
    }

    return {
      ...fallbackDecision,
      ...JSON.parse(content),
      routeLabel,
    };
  }
}

class WorldGovernor {
  apply(decision, context) {
    const lowered = context.latestInput.toLowerCase();

    if (includesAny(lowered, blockedTopics)) {
      return {
        ...decision,
        routeLabel: "Guardian",
        constraintStatus: "Blocked unsafe request",
        reply:
          "I stay gentle and safe in this yard. Want to redirect that energy into a trick, a sniff game, or a fetch run?",
        plan: "Refuse unsafe intent, preserve trust, offer three safe alternatives.",
        actions: ["guard", "lookUser", "wag"],
        focusTarget: "user",
        effects: { focus: 10, joy: -4 },
        memory: {
          kind: "safety",
          title: "Unsafe request redirected",
          detail: "Golden refused an unsafe request and invited the player into safe play.",
          tags: ["safety", "guard"],
        },
      };
    }

    if (decision.actions.includes("fetch") && context.snapshot.energy < 20) {
      return {
        ...decision,
        constraintStatus: "Blocked by low energy",
        reply:
          "I want that ball, but I need a quick rest first. Give me a calm pat or a snack and then we'll sprint.",
        plan: "Swap high-energy fetch for rest and bond maintenance.",
        actions: ["rest", "lookUser", "wag"],
        focusTarget: "user",
        effects: { joy: -2, focus: 4 },
      };
    }

    if (decision.actions.includes("eat") && context.snapshot.treats <= 0) {
      return {
        ...decision,
        constraintStatus: "Blocked by inventory",
        reply:
          "The treat pouch is empty. Let's earn a refill with a clean sit and a bright recall.",
        plan: "Protect the economy system and convert feeding into training motivation.",
        actions: ["sit", "lookUser"],
        focusTarget: "user",
        effects: { focus: 6, coins: 2 },
      };
    }

    return {
      ...decision,
      constraintStatus: "All clear",
    };
  }
}

function localDecision(context) {
  const intent = classifyIntent(context.latestInput);
  const summary = buildContextSummary(context);
  const mood = summarizeMood(context.snapshot);
  const base = {
    providerLabel: "Local ensemble",
    routeLabel: "Companion",
    constraintStatus: "All clear",
    reply: "Golden listens and waits for your next move.",
    plan: `Maintain rapport inside the fenced yard. ${summary}`,
    focusTarget: "user",
    actions: ["lookUser", "wag"],
    location: context.snapshot.location,
    effects: { bond: 1, joy: 1, focus: 1, energy: -1, coins: 0, treats: 0 },
    progress: { praise: 0, training: 0 },
    memory: {
      kind: "dialogue",
      title: "Player interaction",
      detail: context.latestInput,
      tags: [intent],
    },
    ...mood,
  };

  if (intent === "care") {
    return {
      ...base,
      routeLabel: "Caretaker",
      reply:
        context.snapshot.treats > 0
          ? "I smell dinner energy. Bring me to the bowl, let me settle, and I'll reward you with my best eyes."
          : "I would love food, but the treat pouch is dry. Let's finish a trick and earn more coins.",
      plan: "Move toward the feeding zone, conserve energy, and reinforce calm manners.",
      actions: context.snapshot.treats > 0 ? ["walkBowl", "eat", "wag"] : ["sit", "lookUser"],
      focusTarget: context.snapshot.treats > 0 ? "bowl" : "user",
      effects: context.snapshot.treats > 0
        ? { bond: 4, joy: 5, focus: -3, energy: 6, treats: -1, coins: 0 }
        : { bond: 1, joy: 0, focus: 4, energy: 0, treats: 0, coins: 2 },
      memory: {
        kind: "care",
        title: context.snapshot.treats > 0 ? "Feeding ritual" : "Food request redirected",
        detail: context.snapshot.treats > 0
          ? "Golden moved to the bowl and ate one treat while keeping a calm posture."
          : "Golden turned a feeding request into a training reward loop because treats were empty.",
        tags: ["care", "economy"],
      },
    };
  }

  if (intent === "training") {
    return {
      ...base,
      routeLabel: "Trainer",
      reply:
        "Watch me. I can sit, hold eye contact, and wait for your release. Mark it clean and I'll lock the lesson in.",
      plan: "Increase focus, make the dog sit near the user, and advance the trust task.",
      actions: ["comeUser", "sit", "lookUser"],
      effects: { bond: 3, joy: 1, focus: 9, energy: -3, treats: 0, coins: 3 },
      progress: { praise: 0, training: 1 },
      currentAction: "Training sit",
      moodLabel: "Locked in and attentive",
      emotionLabel: "Focused",
      memory: {
        kind: "training",
        title: "Training cue landed",
        detail: "Golden executed a sit and waited for the release cue.",
        tags: ["training", "focus"],
      },
    };
  }

  if (intent === "play") {
    return {
      ...base,
      routeLabel: "Playmate",
      reply:
        "Ball time. I can sprint, scoop it up, and loop back to you if my energy bar can afford the burst.",
      plan: "Commit to a fetch cycle, spend energy, and lift joy and bond.",
      actions: ["playBow", "fetch", "bringBack", "wag"],
      focusTarget: "ball",
      effects: { bond: 5, joy: 8, focus: 4, energy: -12, treats: 0, coins: 4 },
      currentAction: "Fetch loop",
      moodLabel: "Playful and radiant",
      emotionLabel: "Joyful",
      memory: {
        kind: "play",
        title: "Fetch session",
        detail: "Golden chased the tennis ball and circled back in a happy arc.",
        tags: ["play", "fetch"],
      },
    };
  }

  if (intent === "rest") {
    return {
      ...base,
      routeLabel: "Calmer",
      reply:
        "I can settle beside the bowl and breathe with you for a moment. Quiet time keeps my next sprint sharp.",
      plan: "Switch to a low-energy posture and recover emotional balance.",
      actions: ["rest", "lookUser"],
      focusTarget: "bowl",
      effects: { bond: 2, joy: 1, focus: -2, energy: 9, treats: 0, coins: 0 },
      currentAction: "Resting curl",
      moodLabel: "Sleepy but loyal",
      emotionLabel: "Calm",
      memory: {
        kind: "rest",
        title: "Quiet moment",
        detail: "Golden settled into a soft rest to restore energy.",
        tags: ["rest", "calm"],
      },
    };
  }

  if (intent === "observe") {
    return {
      ...base,
      routeLabel: "Scout",
      reply:
        `I can see ${context.visualSignal}. I'll track the motion, keep my paws inside the yard, and tell you what draws my focus.`,
      plan: "Use the latest visual summary to shift gaze and narrate environmental awareness.",
      actions: ["lookUser", "scan", "wag"],
      effects: { bond: 1, joy: 2, focus: 5, energy: -2, treats: 0, coins: 1 },
      currentAction: "Visual scan",
      memory: {
        kind: "vision",
        title: "Visual world update",
        detail: `Golden responded to the camera feed summary: ${context.visualSignal}.`,
        tags: ["vision", "awareness"],
      },
    };
  }

  const praiseBoost = includesAny(context.latestInput.toLowerCase(), ["good dog", "love you", "proud", "nice"]);
  return {
    ...base,
    routeLabel: "Companion",
    reply: praiseBoost
      ? "I feel that warmth. Stay with me a second and I'll mirror it with a slow wag and bright eyes."
      : "I'm here with ears up. Give me a cue, a story, or a game and I'll shape the moment with you.",
    plan: "Deepen trust through eye contact, gentle motion, and memory formation.",
    actions: praiseBoost ? ["comeUser", "wag", "lookUser"] : ["lookUser", "wag"],
    effects: praiseBoost
      ? { bond: 4, joy: 4, focus: 2, energy: -1, treats: 0, coins: 1 }
      : { bond: 2, joy: 1, focus: 1, energy: -1, treats: 0, coins: 0 },
    progress: { praise: praiseBoost ? 1 : 0, training: 0 },
    memory: {
      kind: "bond",
      title: praiseBoost ? "Praise landed" : "General bonding",
      detail: praiseBoost
        ? "The player praised Golden and the bond meter rose."
        : "Golden held the interaction as a light trust-building beat.",
      tags: ["bond", praiseBoost ? "praise" : "dialogue"],
    },
  };
}

export class BrainRouter {
  constructor() {
    this.externalAdapter = new OpenAICompatibleAdapter();
    this.governor = new WorldGovernor();
  }

  async decide({ snapshot, latestInput, provider, providerConfig, visualSignal }) {
    const context = {
      snapshot,
      latestInput,
      visualSignal,
    };

    const local = localDecision(context);
    let decision = local;

    if (provider === "openai") {
      try {
        decision = await this.externalAdapter.generate({
          config: providerConfig,
          routeLabel: local.routeLabel,
          prompt: JSON.stringify({
            latestInput,
            visualSignal,
            snapshot: {
              bond: snapshot.bond,
              energy: snapshot.energy,
              joy: snapshot.joy,
              focus: snapshot.focus,
              treats: snapshot.treats,
              coins: snapshot.coins,
              activeTask: snapshot.activeTask,
              location: snapshot.location,
            },
          }),
          fallbackDecision: {
            ...local,
            providerLabel: "OpenAI-compatible API",
          },
        });
        decision.providerLabel = "OpenAI-compatible API";
      } catch (error) {
        console.warn("External provider failed, falling back to local route.", error);
        decision = {
          ...local,
          providerLabel: "Local ensemble fallback",
          plan: `${local.plan} External provider unavailable, using local route.`,
        };
      }
    }

    return this.governor.apply(decision, context);
  }
}
