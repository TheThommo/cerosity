import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateCoachingText, geminiModel, type LlmTurn } from "./llm";

if (!process.env.GEMINI_API_KEY) {
  console.warn("[GEMINI] GEMINI_API_KEY not set — FLO chat will not work");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface CoachingResponse {
  message: string;
  suggestions: string[];
  redHeadIndicators?: string[];
  blueHeadTechniques?: string[];
  urgencyLevel: "low" | "medium" | "high";
  /** Durable things the athlete disclosed this turn, for the profile. */
  athleteFacts?: AthleteFacts;
}

export interface AthleteFacts {
  preferredName?: string;
  sport?: string;
  challenges?: string[];
  goals?: string[];
}

export interface AssessmentAnalysis {
  overallState: "red_head" | "blue_head" | "transitional";
  strengths: string[];
  opportunities: string[];
  recommendedTechniques: string[];
  insights: string[];
  nextSteps: string[];
}

const DEFAULT_SPORT = "golf";

/**
 * Pull the "message" value out of JSON that will not parse. The character class
 * accepts raw newlines on purpose — an unescaped newline inside the string is
 * exactly the malformation this exists to survive.
 */
function salvageMessageField(jsonish: string): string | null {
  const match = jsonish.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (!match) return null;
  const unescaped = match[1]
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .trim();
  return unescaped || null;
}

export async function getCoachingResponse(
  userMessage: string,
  conversationHistory: any[],
  userContext?: {
    latestAssessment?: any;
    recentProgress?: any[];
    sport?: string;
    systemPromptOverride?: string;
    /**
     * Authenticated coaching. When every provider fails, throw instead of
     * returning canned text — a paying athlete must never be handed scripted
     * filler that reads as if FLO answered (audit B3).
     */
    strict?: boolean;
  }
): Promise<CoachingResponse> {
  const systemPrompt = userContext?.systemPromptOverride || "";

  // History arrives in the Gemini shape the callers already build.
  const history: LlmTurn[] = conversationHistory
    .filter((msg: any) => msg.parts?.[0]?.text?.trim())
    .slice(-12)
    .map((msg: any) => ({
      role: msg.role === "model" ? ("assistant" as const) : ("user" as const),
      text: msg.parts[0].text,
    }));

  let text: string;
  try {
    const result = await generateCoachingText(systemPrompt, history, userMessage);
    text = result.text;
  } catch (error: any) {
    console.error("[FLO] Coaching request failed:", error?.message || error);
    if (userContext?.strict) throw error;
    // Anonymous landing preview soft-degrades rather than showing an error page.
    return generateFallbackResponse(userMessage);
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        message: parsed.message || text,
        suggestions: parsed.suggestions || [],
        redHeadIndicators: parsed.redHeadIndicators || [],
        blueHeadTechniques: parsed.blueHeadTechniques || [],
        urgencyLevel: parsed.urgencyLevel || "low",
        athleteFacts: parsed.athleteFacts
      };
    } catch {
      // The model emitted JSON-shaped text that will not parse — most often a
      // literal newline inside the "message" string, which JSON forbids.
      // Salvage the message rather than showing the athlete raw scaffolding:
      // before this, a malformed reply rendered as `{ "message": "Codeword…`.
      const salvaged = salvageMessageField(jsonMatch[0]);
      if (salvaged) {
        return { message: salvaged, suggestions: [], urgencyLevel: "low" };
      }
    }
  }

  return { message: text.trim(), suggestions: [], urgencyLevel: "low" };
}

// Intelligent fallback response generator
function generateFallbackResponse(userMessage: string): CoachingResponse {
  const message = userMessage.toLowerCase();
  
  // Detect question topics and provide relevant responses
  if (message.includes("control circles") || message.includes("control circle")) {
    return {
      message: "Control Circles are a powerful Red2Blue technique for managing your focus and energy. There are three circles: Inner Circle (things you completely control like your breathing, attitude, and routine), Middle Circle (things you can influence like strategy and preparation), and Outer Circle (things you can't control like weather and other competitors). The key is to only invest your mental energy in the Inner and Middle circles. When you feel stressed or overwhelmed, ask yourself: 'Is this in my control circles?' If not, let it go and refocus on what you can actually influence.",
      suggestions: [
        "Practice identifying what's in each circle before competition",
        "Use box breathing when you catch yourself worrying about Outer Circle stuff",
        "Create a pre-performance routine (Inner Circle control)"
      ],
      redHeadIndicators: ["worrying about uncontrollable factors"],
      blueHeadTechniques: ["Control circles awareness", "Focus redirection"],
      urgencyLevel: "medium"
    };
  }
  
  if (message.includes("breathing") || message.includes("breath")) {
    return {
      message: "Box breathing is your instant reset tool for shifting from Red Head to Blue Head. The pattern is simple: breathe in for 4 counts, hold for 4, breathe out for 4, hold for 4. Do this for 5 cycles minimum. It activates your calm nervous system and gives you immediate control over pressure situations. Use it before key moments, after mistakes, or whenever you feel tension building.",
      suggestions: [
        "Practice box breathing 5 cycles right now",
        "Use it as part of your pre-performance routine",
        "Practice it daily so it becomes automatic under pressure"
      ],
      redHeadIndicators: ["physical tension", "feeling rushed"],
      blueHeadTechniques: ["Box breathing", "Controlled breathing patterns"],
      urgencyLevel: "low"
    };
  }
  
  if (message.includes("nervous") || message.includes("anxiety") || message.includes("pressure")) {
    return {
      message: "Feeling nervous before competition is completely normal and actually shows you care. The goal isn't to eliminate nerves but to channel that energy into focus. Start with box breathing to calm your system, then use your pre-performance routine to give yourself a clear process to follow. Remember: nerves mean you're ready to perform at a higher level.",
      suggestions: [
        "Start with 5 cycles of box breathing",
        "Focus on your process rather than the outcome",
        "Use your 25-second pre-performance routine consistently"
      ],
      redHeadIndicators: ["pre-competition anxiety", "overthinking outcomes"],
      blueHeadTechniques: ["Box breathing", "Process focus", "Routine consistency"],
      urgencyLevel: "medium"
    };
  }
  
  if (message.includes("mistake") || message.includes("error") || message.includes("mess up")) {
    return {
      message: "Mistakes are part of competition, and how you respond to them determines your next performance. The Red2Blue approach: First, take a breath and acknowledge the mistake without judgment. Ask 'What can I learn?' instead of 'Why did I do that?' Then use your reset routine to refocus on the next action. The mantra is 'This moment, right now' to bring your attention back to the present.",
      suggestions: [
        "Practice the 'file it and move on' mental technique",
        "Use box breathing after mistakes to reset your nervous system",
        "Have a specific physical reset routine (like adjusting your equipment)"
      ],
      redHeadIndicators: ["dwelling on past mistakes", "negative self-talk"],
      blueHeadTechniques: ["Mistake recovery process", "Present moment focus"],
      urgencyLevel: "medium"
    };
  }
  
  if (message.includes("putt") || message.includes("green") || message.includes("short game")) {
    return {
      message: "Putting is where the mental game shows up most — small margins, high pressure, lots of time to overthink. The key is your pre-putt routine. Same process every time: read, commit, execute. No second-guessing once you've picked your line. If you're missing putts you normally make, you're probably rushing or letting the last hole creep in. Box breathing before you step up, then trust your read.",
      suggestions: [
        "Build a 15-second pre-putt routine and never skip it",
        "Use 3-2-1 Focus Reset between holes to clear your head",
        "Practice pressure putts with consequences in training"
      ],
      redHeadIndicators: ["overthinking on greens"],
      blueHeadTechniques: ["Pre-putt routine", "Commitment to line", "Present focus"],
      urgencyLevel: "medium"
    };
  }

  if (/^(hi|hello|hey|yo|sup|hiya)\b/i.test(message.trim())) {
    return {
      message: "Hey — I'm FLO. What sport are you in, and what's the main thing on your mind right now?",
      suggestions: [],
      urgencyLevel: "low"
    };
  }

  if (message.includes("opponent") || message.includes("world") || message.includes("ranked") || message.includes("number 1") || message.includes("number one") || message.includes("top seed")) {
    return {
      message: "Playing someone ranked above you is an opportunity, not a threat. Red Head says 'I can't beat them' — Blue Head says 'I control my process.' Forget the name on the other side. Focus on YOUR game plan, YOUR routines, YOUR execution. The scoreboard is an Outer Circle distraction. Stay in your Inner Circle: breathing, rhythm, commitment to each shot.",
      suggestions: [
        "Write down 3 things YOU control in this match",
        "Use box breathing before and between points",
        "Commit to your pre-shot routine on every single ball"
      ],
      redHeadIndicators: ["intimidation", "outcome focus", "comparing yourself to opponent"],
      blueHeadTechniques: ["Control circles", "Process focus", "Pre-performance routine"],
      urgencyLevel: "medium"
    };
  }

  if (message.includes("weather") || message.includes("rain") || message.includes("wind") || message.includes("cold") || message.includes("hot") || message.includes("conditions")) {
    return {
      message: "Weather is the ultimate Outer Circle factor — you cannot control it, but you CAN control how you respond to it. Rain, wind, heat — everyone on the field deals with the same conditions. The athlete who adapts fastest wins. Use your Control Circles: park the weather in the Outer Circle, then ask 'What adjustments are in MY control?' Grip, club selection, tempo, hydration — those are Inner Circle moves.",
      suggestions: [
        "Identify 3 adjustments within your control right now",
        "Accept conditions as equal for everyone — reframe as advantage",
        "Shorten your routine in bad weather to stay decisive"
      ],
      redHeadIndicators: ["complaining about conditions", "using weather as excuse"],
      blueHeadTechniques: ["Control circles", "Rapid adaptation", "Acceptance and refocus"],
      urgencyLevel: "low"
    };
  }

  if (message.includes("confidence") || message.includes("doubt") || message.includes("trust") || message.includes("believe") || message.includes("can't do")) {
    return {
      message: "Confidence isn't something you wait for — it's something you build through action. Red Head waits to 'feel ready.' Blue Head commits to the process and lets confidence follow. Start with your body language: stand tall, move with purpose. Then lock into your pre-performance routine — same process every time builds trust. Confidence comes from preparation and commitment, not from hope.",
      suggestions: [
        "List 3 recent performances where you executed well",
        "Use power posture for 30 seconds before competing",
        "Commit fully to each action — half-commitment kills confidence"
      ],
      redHeadIndicators: ["self-doubt", "hesitation", "waiting to feel ready"],
      blueHeadTechniques: ["Commitment mindset", "Body language reset", "Evidence-based confidence"],
      urgencyLevel: "medium"
    };
  }

  return {
    message: "Every athlete faces moments that test them. Whether it's pressure, focus, or bouncing back from a setback — that's where Red2Blue methodology comes in. The shift from Red Head (reactive, tight, overthinking) to Blue Head (focused, composed, decisive) is a skill you can train. Tell me what's going on — competition nerves, a tough opponent, or something else — and I'll give you a specific technique.",
    suggestions: [
      "Tell me about a recent performance that frustrated you",
      "Describe a pressure moment you want to handle better"
    ],
    redHeadIndicators: [],
    blueHeadTechniques: ["Box breathing", "Process focus", "Control awareness"],
    urgencyLevel: "low"
  };
}

export async function analyzeAssessmentResults(
  intensityScore: number,
  decisionMakingScore: number,
  diversionsScore: number,
  executionScore: number,
  previousAssessments?: any[],
  sport: string = DEFAULT_SPORT
): Promise<AssessmentAnalysis> {
  try {
    const totalScore = intensityScore + decisionMakingScore + diversionsScore + executionScore;
    
    const prompt = `Analyze these Red2Blue mental skills assessment results for an elite ${sport} athlete:

Intensity Management: ${intensityScore}/100
Decision Making: ${decisionMakingScore}/100
Focus & Diversions: ${diversionsScore}/100
Execution: ${executionScore}/100
Total: ${totalScore}/400

Previous assessments: ${JSON.stringify(previousAssessments || [])}

As Flo, the Red2Blue coach, provide analysis in JSON format with:
- overallState: "red_head", "blue_head", or "transitional"
- strengths: array of specific strengths identified
- opportunities: array of areas for improvement
- recommendedTechniques: array of specific techniques to practice
- insights: array of behavioral insights
- nextSteps: array of actionable next steps

Focus on practical, ${sport}-specific insights and simple language.`;

    const model = genAI.getGenerativeModel({ 
      model: geminiModel(),
      generationConfig: {
        maxOutputTokens: 800,
        temperature: 0.6,
      },
    });
    
    // Add timeout wrapper for assessment analysis
    const generateWithTimeout = async () => {
      return Promise.race([
        model.generateContent(prompt),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Assessment analysis timeout')), 8000)
        )
      ]);
    };
    
    const result = await generateWithTimeout() as any;
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    }
    
    // Fallback analysis
    return {
      overallState: totalScore >= 300 ? "blue_head" : totalScore >= 200 ? "transitional" : "red_head",
      strengths: ["Taking the assessment shows commitment to improvement"],
      opportunities: ["Focus on consistency", "Build mental resilience"],
      recommendedTechniques: ["Box breathing", "Pre-performance routine", "Control circles"],
      insights: ["Assessment provides baseline for improvement"],
      nextSteps: ["Practice breathing exercises daily", "Establish consistent routine"]
    };
    
  } catch (error) {
    console.error("Gemini assessment analysis error:", error);
    return {
      overallState: "transitional",
      strengths: ["Commitment to mental game improvement"],
      opportunities: ["Develop consistent mental strategies"],
      recommendedTechniques: ["Box breathing", "Pre-performance routine"],
      insights: ["Regular assessment helps track progress"],
      nextSteps: ["Focus on one technique at a time"]
    };
  }
}

export async function generateAIProfile(
  assessmentData: any,
  userGoals: string,
  sportExperience: string
): Promise<string> {
  try {
    const prompt = `Create a personalized Red2Blue mental performance profile for this athlete:

Assessment Results: ${JSON.stringify(assessmentData)}
Goals: ${userGoals}
Experience Level: ${sportExperience}

Provide a comprehensive but concise profile highlighting their mental game strengths, areas for development, and personalized Red2Blue techniques that would be most effective for them.`;

    const model = genAI.getGenerativeModel({ model: geminiModel() });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    return response.text() || "Your mental game profile shows dedication to improvement. Focus on consistent application of Red2Blue techniques.";
    
  } catch (error) {
    console.error("Gemini profile generation error:", error);
    return "Your mental performance profile shows commitment to developing your mental game. Focus on building consistent routines and managing pressure situations with Red2Blue techniques.";
  }
}

export async function generatePersonalizedPlan(
  userLevel: string,
  specificChallenges: string[],
  availableTime: string,
  sport: string = DEFAULT_SPORT
): Promise<any> {
  try {
    const prompt = `Create a personalized Red2Blue training plan for an elite ${sport} athlete:

Skill Level: ${userLevel}
Specific Challenges: ${specificChallenges.join(", ")}
Available Practice Time: ${availableTime}

Provide a structured plan with daily practices, weekly goals, and specific Red2Blue techniques to address their challenges. Use ${sport}-appropriate examples (e.g. ${sport === "golf" ? "pre-shot routine, course management" : "pre-performance routine"}). Format as JSON with daily_practices, weekly_goals, and monthly_milestones.`;

    const model = genAI.getGenerativeModel({ model: geminiModel() });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // Fallback plan
    return {
      daily_practices: ["5 minutes box breathing", "Pre-shot routine practice"],
      weekly_goals: ["Consistent routine execution", "Pressure situation practice"],
      monthly_milestones: ["Improved focus under pressure", "Consistent Red2Blue application"]
    };
    
  } catch (error) {
    console.error("Gemini plan generation error:", error);
    return {
      daily_practices: ["Box breathing practice", "Mental skills assessment"],
      weekly_goals: ["Routine consistency", "Emotional regulation"],
      monthly_milestones: ["Improved mental game", "Better performance under pressure"]
    };
  }
}