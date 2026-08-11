-- Red2Blue Foundation curriculum seed (LMS)
-- Idempotent: every row uses ON CONFLICT (slug) DO NOTHING so re-running is safe.
-- Source of truth for the learning content. Apply with the Supabase SQL editor,
-- `psql "$DATABASE_URL" -f scripts/seed-curriculum.sql`, or the Supabase MCP.
--
-- Hierarchy: courses -> course_modules -> lessons.
-- Lesson sort_order is GLOBAL across the course (drives prev/next ordering).
-- Content is a JSON array of blocks (see shared/schema.ts LessonBlock).

-- ── Course ─────────────────────────────────────────────────────────
INSERT INTO courses (slug, title, subtitle, description, required_tier, sport, sort_order, is_published)
VALUES (
  'red2blue-foundation',
  'Red2Blue Foundation',
  'Learn to control your attention under pressure',
  'The core Red2Blue curriculum. Three sessions that take you from understanding the method to using it and practising it: what Red2Blue is, how you use it, and how you practise it.',
  'premium', NULL, 1, true
)
ON CONFLICT (slug) DO NOTHING;

-- ── Modules (the three sessions) ───────────────────────────────────
INSERT INTO course_modules (course_id, slug, title, subtitle, summary, sort_order, is_published)
SELECT c.id, 'r2b-session-1', 'Session 1: What Is Red2Blue?', 'The map and the core idea',
       'Performance under pressure comes down to where you put your attention. This session gives you the map, the language, and your first two tools.',
       1, true
FROM courses c WHERE c.slug = 'red2blue-foundation'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO course_modules (course_id, slug, title, subtitle, summary, sort_order, is_published)
SELECT c.id, 'r2b-session-2', 'Session 2: How Do You Use Red2Blue?', 'Pressure, loops and planning tools',
       'Where pressure comes from, how to spot a loop, and the tools that help you prepare: What Ifs and the Screw Up Cascade. Plus scenario practice.',
       2, true
FROM courses c WHERE c.slug = 'red2blue-foundation'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO course_modules (course_id, slug, title, subtitle, summary, sort_order, is_published)
SELECT c.id, 'r2b-session-3', 'Session 3: How Do You Practise Red2Blue?', 'Make it stick',
       'Pressure is personal. This session is about practising: your triggers, the performance timeline, and the review tools that turn Red2Blue into a habit.',
       3, true
FROM courses c WHERE c.slug = 'red2blue-foundation'
ON CONFLICT (slug) DO NOTHING;

-- ── Session 1 lessons (sort_order 1-10) ────────────────────────────
INSERT INTO lessons (module_id, course_id, slug, title, lesson_type, summary, estimated_minutes, content, tool_key, is_free_preview, sort_order)
SELECT m.id, m.course_id, 'welcome-to-red2blue', 'Welcome to Red2Blue', 'intro',
       'The one big idea behind everything you are about to learn.', 3,
$json$[
 {"type":"heading","text":"Welcome to Red2Blue"},
 {"type":"paragraph","text":"Here is the simple idea behind everything you are about to learn. When the pressure is on, the single thing that decides how well you perform is where you put your attention. Not talent. Not how you feel on the day. Attention."},
 {"type":"paragraph","text":"Red2Blue gives you a shared language and a set of practical tools to notice when your attention has drifted to the wrong place, and to bring it back. That is really it. The rest is practice."},
 {"type":"keyPoints","title":"What you will get from this course","items":["A clear map of what happens in your head under pressure","Simple tools you can use in the moment, like Control Circles and What Ifs","A way to practise so it actually sticks when it counts"]},
 {"type":"callout","variant":"blue","title":"How to use this","text":"Go in order. Each lesson is short. Do the tool lessons for real, do not just read them. Small reps beat big intentions."}
]$json$::jsonb,
       NULL, true, 1
FROM course_modules m WHERE m.slug = 'r2b-session-1'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO lessons (module_id, course_id, slug, title, lesson_type, summary, estimated_minutes, content, tool_key, is_free_preview, sort_order)
SELECT m.id, m.course_id, 'the-performance-line', 'Performance Is Not All or Nothing', 'concept',
       'Why performance lives on a scale, and why movement matters more than the score.', 4,
$json$[
 {"type":"heading","text":"Performance Is Not All or Nothing"},
 {"type":"paragraph","text":"Under pressure we tend to think in extremes. Either that was a disaster or I was brilliant. Real performance almost never sits at 0 or 100. It lives somewhere in the middle, which means there is nearly always room to nudge it up a bit."},
 {"type":"paragraph","text":"Picture a line from 0 to 100. Where would you put your last big performance? There is no right answer. The point is not the number, it is movement. High performers are good at one thing in particular: noticing they have slipped, and moving back up quickly."},
 {"type":"keyPoints","title":"Remember","items":["Rate performance on a 0 to 100 scale, not pass or fail","Perfection is rare, and small improvements matter","The goal is movement, not a perfect score"]}
]$json$::jsonb,
       NULL, true, 2
FROM course_modules m WHERE m.slug = 'r2b-session-1'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO lessons (module_id, course_id, slug, title, lesson_type, summary, estimated_minutes, content, tool_key, is_free_preview, sort_order)
SELECT m.id, m.course_id, 'the-performance-triangle', 'The Performance Triangle', 'concept',
       'Structure, Skillset and Mindset, and why mindset is the one left to chance.', 5,
$json$[
 {"type":"heading","text":"The Performance Triangle"},
 {"type":"paragraph","text":"Performance is made of three things: Structure, Skillset and Mindset. Think of it as a triangle. Structure is your plan and your clarity. Skillset is your technical ability. Mindset is your head, how you hold your attention when it matters."},
 {"type":"paragraph","text":"Here is the catch. Most people get good coaching on structure and skills, then get left to figure out mindset on their own. And mindset is usually the most inconsistent part. Your physical skills do not change much week to week. Your headspace can change in minutes."},
 {"type":"callout","variant":"tip","title":"Why this matters","text":"Mindset is not some mysterious gift. It is a skill, and skills can be trained. That is the whole premise of Red2Blue."},
 {"type":"keyPoints","title":"The equation","items":["Performance = Structure + Skillset + Mindset","All three matter, but mindset is the one most often left to chance","Mindset can be developed systematically, just like the others"]}
]$json$::jsonb,
       NULL, false, 3
FROM course_modules m WHERE m.slug = 'r2b-session-1'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO lessons (module_id, course_id, slug, title, lesson_type, summary, estimated_minutes, content, tool_key, is_free_preview, sort_order)
SELECT m.id, m.course_id, 'mindset-is-a-skill', 'Mindset Is a Skill', 'concept',
       'Control of attention is the one thing the whole skill is built on.', 5,
$json$[
 {"type":"heading","text":"Mindset Is a Skill, and Attention Is the Core of It"},
 {"type":"paragraph","text":"Every skill has one central thing it is built on. Riding a bike starts with balance. For mindset, that one thing is control of attention: where you point your attention, on purpose, especially when you are under pressure."},
 {"type":"paragraph","text":"You can only really concentrate on one thing at a time. So when your attention gets pulled onto a missed shot, or a what-if about the future, your performance on the actual task suffers. The skill is noticing that, and choosing where attention goes."},
 {"type":"quote","text":"The prime issue in human performance is the control of attention.","attribution":"Red2Blue"},
 {"type":"keyPoints","title":"The two places attention goes","items":["Process: present, on task, the things that lead to good outcomes","Diversions: past or future, worry, the things you cannot control right now"]}
]$json$::jsonb,
       NULL, false, 4
FROM course_modules m WHERE m.slug = 'r2b-session-1'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO lessons (module_id, course_id, slug, title, lesson_type, summary, estimated_minutes, content, tool_key, is_free_preview, sort_order)
SELECT m.id, m.course_id, 'red-head-blue-head', 'Red Head, Blue Head', 'concept',
       'Two states, one simple colour code you can use under pressure.', 5,
$json$[
 {"type":"heading","text":"Red Head, Blue Head"},
 {"type":"paragraph","text":"Red2Blue gives these two states a colour so they are easy to talk about. The Red Head is diverted. It is underpinned by doubt, a busy inner I can / I cannot dialogue, attention stuck on the past or the future. You often feel hot, tense, heavy."},
 {"type":"paragraph","text":"The Blue Head is on task. It is underpinned by trust in your process. Calmer, more connected, less noise in your head. Not necessarily relaxed, there can still be plenty of intensity, but your mind is present and clear about what to focus on."},
 {"type":"callout","variant":"red","title":"Important","text":"Red is not bad and Blue is not positive thinking. This is not about judging yourself. It is just an observation of where your attention is. Everybody goes Red. The skill is recognising it and moving."},
 {"type":"keyPoints","title":"Quick check","items":["Red: doubt, past or future, busy head, outcome focused","Blue: trust, present, clear, process focused","You are rarely fully one or the other, the aim is to move Bluer"]}
]$json$::jsonb,
       NULL, false, 5
FROM course_modules m WHERE m.slug = 'r2b-session-1'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO lessons (module_id, course_id, slug, title, lesson_type, summary, estimated_minutes, content, tool_key, is_free_preview, sort_order)
SELECT m.id, m.course_id, 'recognise-accept-choose', 'Recognise, Accept, Choose', 'concept',
       'The three-step move from Red to Blue.', 5,
$json$[
 {"type":"heading","text":"The Skill: Recognise, Accept, Choose"},
 {"type":"paragraph","text":"Moving from Red to Blue is a simple three-step move. It sounds obvious written down. Doing it under pressure is the bit that takes practice."},
 {"type":"steps","title":"The three steps","items":["Recognise: notice you are in the Red. Just naming it takes some of the heat out.","Accept: own your response instead of fighting it or defending it. Accepting lets you let it go.","Choose: deliberately put your attention back on something useful. First the overview, then the specific process."]},
 {"type":"callout","variant":"tip","title":"Try the pen test","text":"Grip a pen as tight as you can, then try to pick something else up without letting go. You cannot. Letting go is the hard part, and it is the same with attention. Accepting and releasing is what frees you up to choose."}
]$json$::jsonb,
       NULL, false, 6
FROM course_modules m WHERE m.slug = 'r2b-session-1'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO lessons (module_id, course_id, slug, title, lesson_type, summary, estimated_minutes, content, tool_key, is_free_preview, sort_order)
SELECT m.id, m.course_id, 'the-gazing-principle', 'The Gazing Principle', 'concept',
       'Zoom out, zoom in, and keep your attention moving.', 5,
$json$[
 {"type":"heading","text":"The Gazing Principle: Zoom Out, Zoom In"},
 {"type":"paragraph","text":"The name Red2Blue traces back to the swordsman Musashi, who fought with a double gaze. One eye on the opponent in front of him, the other on the whole battlefield. The skill was switching between the two."},
 {"type":"paragraph","text":"Same for you under pressure. If you only zoom in on the detail, you lose the bigger picture and your decisions get narrow. If you only zoom out, you never execute. Good performers keep moving between the overview and the specifics."},
 {"type":"keyPoints","title":"The four steps","items":["Be aware","This lets you be clear","Which lets you adapt and adjust","Until you just do it, with no gap between trying and doing"]},
 {"type":"callout","variant":"blue","title":"In a sentence","text":"Blue is always two times Blue: keep your attention moving between the overview and the detail. Fixating on either one pulls you back toward Red."}
]$json$::jsonb,
       NULL, false, 7
FROM course_modules m WHERE m.slug = 'r2b-session-1'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO lessons (module_id, course_id, slug, title, lesson_type, summary, estimated_minutes, content, tool_key, is_free_preview, sort_order)
SELECT m.id, m.course_id, 'tool-control-circles', 'Tool: Control Circles', 'tool',
       'Get clarity on what you can control, influence, and not control.', 6,
$json$[
 {"type":"heading","text":"Tool: Control Circles"},
 {"type":"paragraph","text":"When you are overwhelmed, your attention is usually stuck on things you cannot control, like other people reactions or the result. Control Circles gets that clarity back."},
 {"type":"steps","title":"How it works","items":["Write what you cannot control","Write what you can control","Write what you can influence in the middle","Notice how you feel when your attention sits on the cannot-control list, then move it to what you can control"]},
 {"type":"callout","variant":"tip","title":"Why it helps","text":"The more you practise placing attention on what you can control, the wider your circle of influence gets. Clarity creates movement."},
 {"type":"toolEmbed","toolKey":"controlCircles","label":"Open Control Circles"}
]$json$::jsonb,
       'controlCircles', false, 8
FROM course_modules m WHERE m.slug = 'r2b-session-1'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO lessons (module_id, course_id, slug, title, lesson_type, summary, estimated_minutes, content, tool_key, is_free_preview, sort_order)
SELECT m.id, m.course_id, 'tool-recognition-radar', 'Tool: Recognition Radar', 'tool',
       'Spot your own Red and Blue signs so you catch the shift earlier.', 6,
$json$[
 {"type":"heading","text":"Tool: Recognition Radar"},
 {"type":"paragraph","text":"You cannot always know what is going on in someone head, including your own in the heat of the moment. But there are clues. The Recognition Radar helps you spot your own Red and Blue signs so you can catch the shift earlier."},
 {"type":"keyPoints","title":"Red signs (diverted)","items":["Lethargic or over-hyped energy","Tense or stifled movement, head down","Reactive, unclear communication","Rushed decisions, fixated on one option"]},
 {"type":"keyPoints","title":"Blue signs (on task)","items":["Calm intensity","Smooth, deliberate movement, head up","Clear, prioritised communication","Considered options, with check backs"]},
 {"type":"toolEmbed","toolKey":"recognitionRadar","label":"Build your Recognition Radar"}
]$json$::jsonb,
       'recognitionRadar', false, 9
FROM course_modules m WHERE m.slug = 'r2b-session-1'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO lessons (module_id, course_id, slug, title, lesson_type, summary, estimated_minutes, content, tool_key, is_free_preview, sort_order)
SELECT m.id, m.course_id, 'control-of-attention-rituals', 'Control of Attention: Rituals and Grounding', 'exercise',
       'Quick physical exercises to break a loop and get back to the present.', 6,
$json$[
 {"type":"heading","text":"Control of Attention: Rituals and Grounding"},
 {"type":"paragraph","text":"Moving from Red to Blue is a physical thing as much as a mental one. These are quick exercises to break a loop and get back into the present. Like any skill, you need to try them and find which ones work for you."},
 {"type":"steps","title":"Rituals","items":["Do a small physical action: hold your wrist, brush your hands, stamp a foot","Place your attention on something outside you, notice its shape and texture","Choose your next task"]},
 {"type":"steps","title":"Grounding","items":["Place your tongue on the bottom of your mouth","Feel the ground under your feet","Feel your stomach move as you breathe","Optionally hold the first two fingers of your left hand"]},
 {"type":"callout","variant":"info","title":"Learning point","text":"Doing a deliberate physical activity takes the emotional heat out and hands you back a sense of control. Practise these when you are calm so they are there when you are not."}
]$json$::jsonb,
       NULL, false, 10
FROM course_modules m WHERE m.slug = 'r2b-session-1'
ON CONFLICT (slug) DO NOTHING;

-- ── Session 2 lessons (sort_order 11-16) ───────────────────────────
INSERT INTO lessons (module_id, course_id, slug, title, lesson_type, summary, estimated_minutes, content, tool_key, is_free_preview, sort_order)
SELECT m.id, m.course_id, 'where-pressure-comes-from', 'Where Pressure Comes From', 'concept',
       'The three sources of pressure (APE) and the three Red responses.', 5,
$json$[
 {"type":"heading","text":"Where Pressure Comes From"},
 {"type":"paragraph","text":"A lot of what tips us into the Red is predictable. Pressure tends to come from three places. An easy way to remember them is APE."},
 {"type":"keyPoints","title":"The sources of pressure (APE)","items":["Expectation: how you or others expect things to go","Scrutiny: being watched and judged, by yourself or others","Consequence: what happens if it goes wrong"]},
 {"type":"paragraph","text":"These three are actually useful. They drive performance. The problem is when they get overwhelming or unpredictable. Then we tend to respond in one of three ways."},
 {"type":"keyPoints","title":"Three Red responses","items":["Aggressive: snappy, dismissive, verbally hot","Passive: victim mode, blaming, lethargic, checked out","Escape: wanting it to be over, wanting to hide"]},
 {"type":"callout","variant":"tip","title":"The move","text":"Spot the trigger and the response. Which pressure point tipped you, and how did you react? That is your recognition radar working."}
]$json$::jsonb,
       NULL, false, 11
FROM course_modules m WHERE m.slug = 'r2b-session-2'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO lessons (module_id, course_id, slug, title, lesson_type, summary, estimated_minutes, content, tool_key, is_free_preview, sort_order)
SELECT m.id, m.course_id, 'spotting-the-loop', 'Spotting the Loop', 'concept',
       'How attention gets stuck, and how to catch it.', 4,
$json$[
 {"type":"heading","text":"Spotting the Loop"},
 {"type":"paragraph","text":"A loop is when your attention gets stuck. Something happens, you have an emotional response, and instead of dealing with the issue you get busy with the story about it. The issue does not get handled, and you slide further into the Red."},
 {"type":"paragraph","text":"Think back to a time you performed poorly. Where was your attention? Now a time you performed well. Where was it then? Most people find the same pattern: poor performance follows diverted attention."},
 {"type":"keyPoints","title":"Ask yourself","items":["What takes me off task?","What pressure point triggered it?","How did it affect my performance and the people around me?","What could get me back on task faster next time?"]}
]$json$::jsonb,
       NULL, false, 12
FROM course_modules m WHERE m.slug = 'r2b-session-2'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO lessons (module_id, course_id, slug, title, lesson_type, summary, estimated_minutes, content, tool_key, is_free_preview, sort_order)
SELECT m.id, m.course_id, 'tool-what-ifs', 'Tool: What Ifs', 'tool',
       'Plan for what could go wrong so you stay Blue when it does.', 6,
$json$[
 {"type":"heading","text":"Tool: What Ifs"},
 {"type":"paragraph","text":"Proper preparation prevents poor performance. The What Ifs tool is you deliberately thinking through what could go wrong, and planning how you will stay Blue when it does. It stops you catastrophising everything equally in the moment."},
 {"type":"steps","title":"How it works","items":["List the things likely to send you or your team Red","Rate each one 1 to 10 for risk and impact","Write a strategy to stay or get back to Blue: a ritual, a key word, breathing, a process","Practise the strategies under pressure so they actually work"]},
 {"type":"callout","variant":"blue","title":"Make it a habit","text":"What Ifs never really end. The best performers do them before every big moment. What is familiar is far less daunting."},
 {"type":"toolEmbed","toolKey":"whatIfs","label":"Open What Ifs"}
]$json$::jsonb,
       'whatIfs', false, 13
FROM course_modules m WHERE m.slug = 'r2b-session-2'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO lessons (module_id, course_id, slug, title, lesson_type, summary, estimated_minutes, content, tool_key, is_free_preview, sort_order)
SELECT m.id, m.course_id, 'tool-screw-up-cascade', 'Tool: Screw Up Cascade', 'tool',
       'Reverse engineer your own mistakes to see what to change.', 5,
$json$[
 {"type":"heading","text":"Tool: Screw Up Cascade"},
 {"type":"paragraph","text":"This one sounds odd but it works. Imagine you wanted to be really bad at something. How would you do it? Teaching yourself how to screw it up reveals the things you might actually be doing without realising."},
 {"type":"steps","title":"How it works","items":["List all the ways you could screw this up","Pick the top three, the ones you do most","Decide a useful strategy to avoid each one"]},
 {"type":"callout","variant":"tip","title":"Why it helps","text":"It gives you honest, specific information about what to change, which is much more useful than a vague try harder."},
 {"type":"toolEmbed","toolKey":"screwUpCascade","label":"Open Screw Up Cascade"}
]$json$::jsonb,
       'screwUpCascade', false, 14
FROM course_modules m WHERE m.slug = 'r2b-session-2'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO lessons (module_id, course_id, slug, title, lesson_type, summary, estimated_minutes, content, tool_key, is_free_preview, sort_order)
SELECT m.id, m.course_id, 'practice-the-penalty', 'Practice: The Penalty', 'scenario',
       'Work a high pressure scenario and find the move to Blue.', 5,
$json$[
 {"type":"heading","text":"Practice: The Penalty"},
 {"type":"paragraph","text":"Read the scenario, then work through the prompts. There are no right answers. The point is to practise spotting Red thoughts and finding the move to Blue."},
 {"type":"scenarioPrompts","scenario":"It is sudden death in a cup quarter final against a rival you have not beaten in three years. You have to score to win. The crowd is loud, teammates are reminding you of two chances you missed earlier, and you did not even want to take this penalty. You are thinking about those misses and one you missed three weeks ago.","prompts":["What Red Head thoughts might this lead to?","How could those thoughts make you feel and act?","How could that affect your performance?","What might shift your attention from Red to Blue?"]}
]$json$::jsonb,
       NULL, false, 15
FROM course_modules m WHERE m.slug = 'r2b-session-2'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO lessons (module_id, course_id, slug, title, lesson_type, summary, estimated_minutes, content, tool_key, is_free_preview, sort_order)
SELECT m.id, m.course_id, 'practice-the-audition', 'Practice: The Audition', 'scenario',
       'A second scenario to rehearse the Red to Blue shift.', 5,
$json$[
 {"type":"heading","text":"Practice: The Audition"},
 {"type":"paragraph","text":"Same drill. Notice the Red thoughts, then find the move to Blue."},
 {"type":"scenarioPrompts","scenario":"You have arrived at the audition for the best drama school in London. You prepared for months and you know the scrutiny will be intense. Then you realise you left your music sheet at home, so you will have to sing acapella in front of everyone. You start to panic.","prompts":["What Red Head thoughts might this lead to?","How could those thoughts make you feel and act?","How could that affect your performance?","What might shift your attention from Red to Blue?"]}
]$json$::jsonb,
       NULL, false, 16
FROM course_modules m WHERE m.slug = 'r2b-session-2'
ON CONFLICT (slug) DO NOTHING;

-- ── Session 3 lessons (sort_order 17-23) ───────────────────────────
INSERT INTO lessons (module_id, course_id, slug, title, lesson_type, summary, estimated_minutes, content, tool_key, is_free_preview, sort_order)
SELECT m.id, m.course_id, 'pressure-is-personal', 'Pressure Is Personal', 'concept',
       'The same situation lands differently on everyone.', 4,
$json$[
 {"type":"heading","text":"Pressure Is Personal"},
 {"type":"paragraph","text":"The same situation lands completely differently on different people. One person finds a fast quiz exciting, another finds it unfair, another panics because it will not be marked. None of them are wrong. Pressure means different things to different people."},
 {"type":"keyPoints","title":"What this tells us","items":["People respond to pressure in their own way","You get to choose how you deal with it","Success comes from applying yourself to the task, not from the pressure itself"]},
 {"type":"callout","variant":"info","title":"The useful bit","text":"Once you know your own pattern, you can plan for it. That is what the rest of this session is about."}
]$json$::jsonb,
       NULL, false, 17
FROM course_modules m WHERE m.slug = 'r2b-session-3'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO lessons (module_id, course_id, slug, title, lesson_type, summary, estimated_minutes, content, tool_key, is_free_preview, sort_order)
SELECT m.id, m.course_id, 'your-myths-and-triggers', 'Your Myths and Triggers', 'concept',
       'Your beliefs shape your responses. Awareness keeps perspective.', 5,
$json$[
 {"type":"heading","text":"Your Myths and Triggers"},
 {"type":"paragraph","text":"Your beliefs feel like absolute truth, but they are really your truth, your personal perspective. They shape how you respond to events. Sometimes defending them helps. Often, a bit of flexibility helps more."},
 {"type":"paragraph","text":"This is not about ditching your values. They are a driving force and they matter. It is about being aware of them so you can keep perspective when something feels like a threat, instead of sliding straight down the scale."},
 {"type":"keyPoints","title":"Reflect","items":["What rules or values tend to tip me Red when they get challenged?","Is defending them helping me in this moment, or getting in the way?","What is a more flexible way to see it?"]}
]$json$::jsonb,
       NULL, false, 18
FROM course_modules m WHERE m.slug = 'r2b-session-3'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO lessons (module_id, course_id, slug, title, lesson_type, summary, estimated_minutes, content, tool_key, is_free_preview, sort_order)
SELECT m.id, m.course_id, 'the-performance-timeline', 'The Performance Timeline', 'concept',
       'Five stages: Purpose, Preparation, Performance, Reset, Revision.', 5,
$json$[
 {"type":"heading","text":"The Performance Timeline"},
 {"type":"paragraph","text":"Red2Blue is used most in the heat of the moment, but you get better at it by working both sides of the event too. The timeline has five stages."},
 {"type":"keyPoints","title":"The five stages","items":["Purpose: being specific about what should happen","Preparation: being deliberate about what could happen","Performance: being on task while it is happening","Reset: being accountable for what happened","Revision: being clear about what is next"]},
 {"type":"callout","variant":"blue","title":"How to use it","text":"Start in the middle, the performance itself, then build out the preparation and review around it. Different tools help at different stages."}
]$json$::jsonb,
       NULL, false, 19
FROM course_modules m WHERE m.slug = 'r2b-session-3'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO lessons (module_id, course_id, slug, title, lesson_type, summary, estimated_minutes, content, tool_key, is_free_preview, sort_order)
SELECT m.id, m.course_id, 'tool-priority-planner', 'Tool: Priority Planner', 'tool',
       'Your one pager: purpose, a few building blocks, the actions that matter.', 6,
$json$[
 {"type":"heading","text":"Tool: Priority Planner"},
 {"type":"paragraph","text":"Improving performance works best when you are clear about what you are aiming for. The Priority Planner is your one pager. A clear purpose, a few key building blocks, and the actions that matter most."},
 {"type":"paragraph","text":"Because attention is the prime issue, it is better to focus on a few things and do them really well than to spread yourself thin across everything and be average at all of it."},
 {"type":"steps","title":"What it captures","items":["Your purpose and primary indicator","A handful of critical building blocks","The key actions and who owns them","How you will know it is working"]},
 {"type":"toolEmbed","toolKey":"priorityPlanner","label":"Open Priority Planner"}
]$json$::jsonb,
       'priorityPlanner', false, 20
FROM course_modules m WHERE m.slug = 'r2b-session-3'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO lessons (module_id, course_id, slug, title, lesson_type, summary, estimated_minutes, content, tool_key, is_free_preview, sort_order)
SELECT m.id, m.course_id, 'tool-mental-skills-xcheck', 'Tool: Mental Skills X-Check', 'tool',
       'An honest performance review through a Red2Blue lens.', 6,
$json$[
 {"type":"heading","text":"Tool: Mental Skills X-Check"},
 {"type":"paragraph","text":"You do not get physically fit by accident, and you will not get mentally stronger without working at it. The X-Check is an honest review of a performance through a Red2Blue lens. It keeps you away from lazy good or bad reviews."},
 {"type":"keyPoints","title":"The four areas, scored out of 100","items":["Intensity: did I bring the right level and stay calm when needed?","Diversions: did I avoid getting pulled off task?","Decision making: did I adapt and use feedback?","Execution: did I choose and deliver the right skill under pressure?"]},
 {"type":"callout","variant":"tip","title":"Use it like a half time check","text":"Was it Red or Blue overall? On the Red side, was it intensity or diversions? On the Blue side, was it strategy or execution? Then pick one thing to adjust."},
 {"type":"toolEmbed","toolKey":"mentalSkillsXCheck","label":"Open Mental Skills X-Check"}
]$json$::jsonb,
       'mentalSkillsXCheck', false, 21
FROM course_modules m WHERE m.slug = 'r2b-session-3'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO lessons (module_id, course_id, slug, title, lesson_type, summary, estimated_minutes, content, tool_key, is_free_preview, sort_order)
SELECT m.id, m.course_id, 'more-control-of-attention', 'More Control of Attention Exercises', 'exercise',
       'STOP, Spaces, Laser and Labelling.', 6,
$json$[
 {"type":"heading","text":"More Control of Attention Exercises"},
 {"type":"paragraph","text":"A few more ways to break a loop and bring your attention back to the present. Try them, and keep the ones that work for you."},
 {"type":"steps","title":"STOP","items":["Take one to three slow breaths, longer out than in","Observe your thoughts and feelings without getting caught in them","Proceed purposefully with the next step"]},
 {"type":"steps","title":"Spaces and Laser","items":["Spaces: look up and count as many spaces around you as you can","Laser: pick objects around you and place an imaginary coloured dot in the centre of each, then look up and around between each one"]},
 {"type":"steps","title":"Labelling","items":["Notice the label or judgement you have put on a person or situation","Try giving it a different label and notice what changes","Often the label drives the response more than the thing itself"]}
]$json$::jsonb,
       NULL, false, 22
FROM course_modules m WHERE m.slug = 'r2b-session-3'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO lessons (module_id, course_id, slug, title, lesson_type, summary, estimated_minutes, content, tool_key, is_free_preview, sort_order)
SELECT m.id, m.course_id, 'putting-it-all-together', 'Putting It All Together', 'assessment',
       'Recap, next steps, and your Foundation certificate.', 5,
$json$[
 {"type":"heading","text":"Putting It All Together"},
 {"type":"paragraph","text":"That is the foundation. You have got the map (Red and Blue, control of attention), the skill (Recognise, Accept, Choose), and the tools (Control Circles, Recognition Radar, What Ifs, Screw Up Cascade, Priority Planner, Mental Skills X-Check)."},
 {"type":"paragraph","text":"None of it works by reading alone. It works when you practise, ideally under a bit of real pressure, until moving from Red to Blue becomes something you just do."},
 {"type":"keyPoints","title":"Your next steps","items":["Use the map: am I Red or Blue right now?","Use the tools, especially What Ifs, before big moments","Do a Mental Skills X-Check after a performance and pick one thing to adjust"]},
 {"type":"callout","variant":"blue","title":"Finish the course","text":"Complete every lesson to earn your Red2Blue Foundation certificate. Then keep practising, that is where the real gains are."}
]$json$::jsonb,
       NULL, false, 23
FROM course_modules m WHERE m.slug = 'r2b-session-3'
ON CONFLICT (slug) DO NOTHING;
