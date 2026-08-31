# Endorser photos — filename now matches the face

Commit e7152e2. The landing page JSX has always been name-matched
(`Imogen Hall` -> `/endorsers/imogen-hall.png`); what was wrong was the bytes
inside the files. The contents were moved, not the paths.

## Before -> after (who is inside each file)

| file | held before | holds now |
| --- | --- | --- |
| brian-ashton.png | Brian Ashton | Brian Ashton (unchanged) |
| ashley-giles.png | Alice Powell | Ashley Giles |
| alice-powell.png | Vicki Anstey | Alice Powell |
| vicki-anstey.png | James Newman | Vicki Anstey |
| imogen-hall.png | Kerry Inscker | Imogen Hall |
| james-newman.png | Darren Cassidy | James Newman |
| kerry-inscker.png | Imogen Hall | Kerry Inscker |
| stuart-lancaster.png | Stuart Lancaster | Stuart Lancaster (unchanged) |
| adrian-larsson.png | Ashley Giles | Adrian Larsson |
| darren-cassidy.png | Adrian Larsson | Darren Cassidy (unused by the page) |

Identification anchors: racing overalls and helmet (Alice Powell), ocean rowing
boat under national flags (Vicki Anstey), Red2Blue Athlete certificate on a
Dubai course (Imogen Hall), Red2Blue Coach certificate with a Callaway cap
(Adrian Larsson), cricket ground lanyard (Ashley Giles), England rugby O2
training top (Stuart Lancaster).

## Programmes cards

`athlete.png` held the Red2Blue **Coach** certificate photo and `coach.png` held
the **Athlete** one, and the JSX crossed the two srcs back over — the page
looked right while both filenames lied. Images swapped, cards now load the
asset they are named for. No visible change to the rendered section.
