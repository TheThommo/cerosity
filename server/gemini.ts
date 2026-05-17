import { GoogleGenerativeAI } from "@google/generative-ai";

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

export async function getCoachingResponse(
  userMessage: string,
  conversationHistory: any[],
  userContext?: {
    latestAssessment?: any;
    recentProgress?: any[];
    sport?: string;
    systemPromptOverride?: string;
  }
): Promise<CoachingResponse> {
  if (!process.env.GEMINI_API_KEY) {
    console.error("[GEMINI] No API key — returning fallback");
    return generateFallbackResponse(userMessage);
  }

  try {
    const systemPrompt = userContext?.systemPromptOverride || "";

    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
      systemInstruction: systemPrompt,
      generationConfig: {
        maxOutputTokens: 800,
        temperature: 0.7,
      },
    });

    const validHistory = conversationHistory
      .filter((msg: any) => msg.parts?.[0]?.text?.trim())
      .slice(-12);
    if (validHistory.length > 0 && validHistory[0].role !== "user") {
      validHistory.shift();
    }

    const chat = model.startChat({ history: validHistory });

    const sendWithTimeout = async () => {
      return Promise.race([
        chat.sendMessage(userMessage),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Gemini timeout after 12s")), 12000)
        )
      ]);
    };

    const result = await sendWithTimeout() as any;
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        message: parsed.message || text,
        suggestions: parsed.suggestions || [],
        redHeadIndicators: parsed.redHeadIndicators || [],
        blueHeadTechniques: parsed.blueHeadTechniques || [],
        urgencyLevel: parsed.urgencyLevel || "low"
      };
    }

    return { message: text.trim(), suggestions: [], urgencyLevel: "low" };

  } catch (error: any) {
    console.error("[GEMINI] Chat error:", error?.message || error);
    return generateFallbackResponse(userMessage);
  }
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

  return {
    message: "Good question. Tell me a bit more about what's going on — what situation are you dealing with? The more specific you are, the more I can help. Are you struggling with pressure, focus, confidence, or something else?",
    suggestions: [
      "Tell me about a recent performance that frustrated you",
      "Ask about a specific technique like box breathing or control circles",
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
      model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
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

    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-1.5-flash" });
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

    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-1.5-flash" });
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