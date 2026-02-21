import { Assignment, Course, GradingScreen, RubricCriterion, Submission } from './types';

export const CALIBRATION_SUBMISSIONS_REQUIRED = 3; // Minimum 3 submissions for calibration

export const MOCK_COURSES: Course[] = [
  { id: 'cs101', name: 'CS101 - Introduction to Computer Science' },
  { id: 'lit205', name: 'LIT205 - American Literature Since 1900' },
  { id: 'hist301', name: 'HIST301 - World History: Modern Era' },
];

export const MOCK_ASSIGNMENTS: Assignment[] = [
  { id: 'cs101-a1', name: 'Lab Report 1: Data Structures', courseId: 'cs101', hasRubric: true },
  { id: 'lit205-e1', name: 'Essay 1: Modernism in Fiction', courseId: 'lit205', hasRubric: true },
  { id: 'lit205-e2', name: 'Essay 2: Post-War American Poetry Analysis', courseId: 'lit205', hasRubric: true },
  { id: 'hist301-p1', name: 'Research Project Proposal', courseId: 'hist301', hasRubric: false },
];

export const MOCK_RUBRICS: { [assignmentId: string]: RubricCriterion[] } = {
  'lit205-e1': [
    { id: 'crit1', name: 'Thesis Clarity & Development', description: 'The clarity and originality of the thesis statement, and its sustained development throughout the essay.', maxScore: 5 },
    { id: 'crit2', name: 'Argumentation & Evidence', description: 'The strength of arguments, logical flow, and effective use of textual evidence to support claims.', maxScore: 5 },
    { id: 'crit3', name: 'Analysis & Interpretation', description: 'Depth of literary analysis, insightfulness of interpretations, and avoidance of mere summary.', maxScore: 5 },
    { id: 'crit4', name: 'Organization & Structure', description: 'The overall coherence, paragraph structure, transitions, and introduction/conclusion effectiveness.', maxScore: 4 },
    { id: 'crit5', name: 'Language & Style', description: 'Clarity, conciseness, precision of language, grammar, spelling, and adherence to academic conventions.', maxScore: 3 },
  ],
  'lit205-e2': [
    { id: 'crit1', name: 'Interpretive Depth', description: 'How deeply the student explores the poem\'s themes and techniques.', maxScore: 10 },
    { id: 'crit2', name: 'Contextual Awareness', description: 'Understanding of the historical/literary context of the chosen poet/poem.', maxScore: 8 },
    { id: 'crit3', name: 'Textual Support', description: 'Effective integration and analysis of specific poetic lines/stanzas.', maxScore: 7 },
  ],
  'cs101-a1': [
    { id: 'cs-crit1', name: 'Code Correctness', description: 'The accuracy and functionality of the implemented code.', maxScore: 10 },
    { id: 'cs-crit2', name: 'Algorithm Efficiency', description: 'The optimization and efficiency of chosen algorithms.', maxScore: 8 },
    { id: 'cs-crit3', name: 'Documentation & Comments', description: 'Clarity and thoroughness of code comments and external documentation.', maxScore: 7 },
  ],
};

export const MOCK_SUBMISSIONS: { [assignmentId: string]: Submission[] } = {
  'lit205-e1': [
    {
      id: 'sub1', assignmentId: 'lit205-e1', studentName: 'Alice Smith', graded: false,
      content: `The Great Gatsby, by F. Scott Fitzgerald, is a profound exploration of the American Dream's corruption in the Roaring Twenties. Jay Gatsby's relentless pursuit of wealth and status, driven by his desire to win back Daisy Buchanan, exemplifies this decline. His elaborate parties, while seemingly glamorous, are ultimately empty displays designed to attract Daisy. The novel's strength lies in its depiction of how idealism can be twisted by materialism and a longing for the past. Daisy, as a character, embodies the unattainable ideal Gatsby projects onto her. She is charming yet ultimately superficial, unable to transcend her social standing or commit to Gatsby's grand vision. Her decision to remain with Tom, despite his infidelity, underscores her passive nature and dependence on security. Fitzgerald uses the setting of West Egg and East Egg to symbolize the divide between new money and old money, highlighting the superficiality of both. The green light at the end of Daisy's dock becomes a powerful symbol of Gatsby's longing and the elusive nature of his dream. The narrative's melancholic tone, conveyed through Nick Carraway's reflective narration, emphasizes the tragedy of Gatsby's fate. While the character development for Gatsby is strong, Daisy's motivations could be more deeply explored. The book brilliantly critiques the societal values of the time, revealing the hollowness beneath the gilded age.`
    },
    {
      id: 'sub2', assignmentId: 'lit205-e1', studentName: 'Bob Johnson', graded: false,
      content: `F. Scott Fitzgerald's The Great Gatsby critiques the superficiality of the Jazz Age and the illusion of the American Dream. Gatsby's love for Daisy is a central theme, portraying his desperate attempts to recreate a past that no longer exists. His wealth accumulation is solely for her, but his methods are often questionable, linking him to the criminal underworld. The novel suggests that the American Dream, once about self-reliance and opportunity, became about materialistic gain. The description of Daisy is somewhat limited, making it hard to fully grasp her complex choices. Tom Buchanan serves as a foil to Gatsby, representing old money's arrogance and hypocrisy. The Valley of Ashes, a desolate wasteland, starkly contrasts with the opulence of the Eggs, showing the grim reality beneath the facade of prosperity. Nick Carraway's role as narrator provides an outsider's perspective, allowing for critical commentary. Gatsby's parties are shown as symbols of his misguided hope. The novel's ending, with Gatsby's death and Nick's disillusionment, powerfully conveys the impossibility of reclaiming lost time and the emptiness of materialistic pursuits.`
    },
    {
      id: 'sub3', assignmentId: 'lit205-e1', studentName: 'Charlie Brown', graded: false,
      content: `The Great Gatsby explores themes of wealth, class, and the elusive American Dream. Gatsby's pursuit of Daisy represents an attempt to recapture the past, but his efforts are ultimately futile. The novel portrays the superficiality of 1920s society through characters like Tom and Daisy Buchanan, who are wealthy but morally bankrupt. Gatsby's lavish lifestyle is a means to an end, specifically to impress Daisy. The contrast between West Egg and East Egg is significant, representing new wealth versus inherited wealth. The story's effectiveness is somewhat hampered by the lack of depth in some characters. The symbolism, especially the green light and the eyes of Doctor T.J. Eckleburg, is very powerful, adding layers of meaning to the narrative. Nick's journey from observer to critic offers a crucial lens through which the reader understands the moral decay of the era. The tragic conclusion underscores Fitzgerald's critique of the era's excesses and the unachievable nature of Gatsby's idealized vision.`
    },
    {
      id: 'sub4', assignmentId: 'lit205-e1', studentName: 'Diana Prince', graded: false,
      content: `In The Great Gatsby, F. Scott Fitzgerald masterfully dissects the perversion of the American Dream, using Jay Gatsby's doomed obsession with Daisy Buchanan as its tragic centerpiece. Gatsby's monumental efforts to amass wealth and host extravagant parties are not for personal pleasure, but solely as a beacon for Daisy, a woman he idealizes beyond reality. This profound yearning for a past that cannot be recaptured highlights the novel's central critique: that the pursuit of happiness, when intertwined with materialism and a romanticized past, leads to inevitable disillusionment. Daisy, though beautiful and charming, is ultimately a product of her environment—indecisive, comfort-seeking, and tragically incapable of living up to Gatsby's grand expectations. Her choice to retreat to Tom's security, despite his obvious flaws, solidifies her inability to break free from her privileged, yet hollow, existence. Fitzgerald brilliantly contrasts the garish spectacle of West Egg with the staid aristocracy of East Egg, demonstrating the moral bankruptcy prevalent across the social spectrum. The omnipresent green light serves as a poignant symbol of Gatsby's distant, ever-receding dream. Nick Carraway's narrative voice, tinged with wistfulness and moral judgment, effectively guides the reader through the societal critique and the personal tragedy. The novel's enduring power lies in its complex characterizations, particularly Gatsby's unwavering, albeit misguided, idealism, and its timeless exploration of hope, illusion, and the devastating cost of an unattainable dream. The prose is beautiful and evocative, drawing the reader deeply into the Jazz Age.`
    },
    {
      id: 'sub5', assignmentId: 'lit205-e1', studentName: 'Eve Taylor', graded: false,
      content: `The Great Gatsby is a novel by F. Scott Fitzgerald. It tells the story of Jay Gatsby, a rich man who loves Daisy Buchanan. Gatsby tries to get Daisy back by throwing parties and showing off his wealth. This shows how money was important in the 1920s. Daisy is married to Tom, who is also rich. The book talks about the American Dream and how it changed. Nick Carraway is the narrator, and he tells us about Gatsby's life. The green light is a symbol of Gatsby's hope. The story ends sadly for Gatsby. The novel is set in New York. The characters are rich and live fancy lives, but there are also poor people in the Valley of Ashes. The themes are love, money, and the past. It's a classic book.`
    },
    {
      id: 'sub6', assignmentId: 'lit205-e1', studentName: 'Frank White', graded: false,
      content: `Fitzgerald's "The Great Gatsby" presents a cynical view of the American Dream through the lens of Jay Gatsby's pursuit of Daisy Buchanan. Gatsby's transformation from impoverished idealist to wealthy bootlegger highlights the era's conflation of success with material accumulation. His mansion and parties are elaborate traps, meticulously constructed to lure Daisy, exposing his profound loneliness. Daisy, a symbol of old money's allure, remains ultimately inaccessible and selfish, incapable of reciprocating Gatsby's intense, singular devotion. Her inability to break from Tom, a brutish symbol of inherited privilege, speaks volumes about the entrenched social structures of the time. The contrast between West Egg's gaudy new money and East Egg's stale aristocracy underscores the moral vacuum of the wealthy. Nick's narration is critical yet often sympathetic, serving as the moral compass. The novel excels in its use of symbolism, from the green light to the eyes of Doctor T.J. Eckleburg, which serve as silent judges of the moral decay. The tragic climax and denouement underscore the fragility of dreams built on illusions. Fitzgerald's masterful prose elevates this story beyond a simple romance into a biting social commentary, exploring themes of class, illusion, and the devastating consequences of living in the past. The character development is consistent and the pacing is excellent.`
    },
  ],
};

export const INITIAL_ANALYTICS = {
  explanationValidityRate: 0,
  scoreDriftPercentage: 0,
  criterionVarianceHeatmap: {},
  justificationStrengthTrend: [],
  highRiskFlags: [],
  overrideCount: 0,
  earlyVsLateScores: {
    early: {},
    late: {},
  },
  rubricAdherencePercentage: 0,
  sessionConfidenceScore: 0,
  aiAssistanceSummary: {
    totalInterventions: 0,
    refinementsApplied: 0,
    overridesAfterIntervention: 0,
  },
};
