export interface BuiltInTemplate {
  id: string
  name: string
  description: string
  content: string // HTML
}

export const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  {
    id: 'customer-discovery',
    name: 'Customer Discovery',
    description: 'Structured for user research and discovery interviews',
    content: `<h2>Customer Discovery</h2>
<h3>Participant</h3>
<p>Name / Role / Company:</p>
<h3>Goals</h3>
<ul><li>What are we trying to learn?</li></ul>
<h3>Key Questions Asked</h3>
<ol><li></li></ol>
<h3>Pain Points Discovered</h3>
<ul><li></li></ul>
<h3>Insights &amp; Quotes</h3>
<blockquote><p></p></blockquote>
<h3>Action Items</h3>
<ul data-type="taskList"><li data-type="taskItem" data-checked="false"></li></ul>`,
  },
  {
    id: 'one-on-one',
    name: '1-on-1',
    description: 'Weekly or bi-weekly manager / direct report meeting',
    content: JSON.stringify({
      __template: 'one-on-one',
      sections: [
        { id: 's1', title: 'Discussion topics', collapsed: false, tasks: [] },
        { id: 's2', title: 'Action items', collapsed: false, tasks: [] },
        { id: 's3', title: 'Project updates', collapsed: false, tasks: [] },
        { id: 's4', title: 'Growth and development', collapsed: false, tasks: [] },
      ],
    }),
  },
  {
    id: 'sales-call',
    name: 'Sales Call',
    description: 'Capture prospect details, objections, and next steps',
    content: `<h2>Sales Call</h2>
<h3>Prospect Details</h3>
<p>Company: <br>Contact: <br>Role: <br>Deal size: </p>
<h3>Current Situation</h3>
<p></p>
<h3>Pain Points</h3>
<ul><li></li></ul>
<h3>Objections &amp; Responses</h3>
<ul><li></li></ul>
<h3>Demo Notes</h3>
<p></p>
<h3>Next Steps</h3>
<ul data-type="taskList"><li data-type="taskItem" data-checked="false">Send follow-up email</li></ul>`,
  },
  {
    id: 'user-interview',
    name: 'User Interview',
    description: 'Usability testing and product feedback sessions',
    content: `<h2>User Interview</h2>
<h3>Participant Background</h3>
<p>Role: <br>Experience level: <br>Current tools: </p>
<h3>Tasks &amp; Observations</h3>
<ol><li></li></ol>
<h3>Usability Issues</h3>
<ul><li></li></ul>
<h3>Positive Feedback</h3>
<ul><li></li></ul>
<h3>Feature Requests</h3>
<ul><li></li></ul>
<h3>Action Items</h3>
<ul data-type="taskList"><li data-type="taskItem" data-checked="false"></li></ul>`,
  },
  {
    id: 'daily-standup',
    name: 'Daily Standup',
    description: 'Quick daily sync — yesterday, today, blockers',
    content: `<h2>Daily Standup</h2>
<h3>Yesterday</h3>
<ul><li></li></ul>
<h3>Today</h3>
<ul><li></li></ul>
<h3>Blockers</h3>
<ul><li></li></ul>`,
  },
]
