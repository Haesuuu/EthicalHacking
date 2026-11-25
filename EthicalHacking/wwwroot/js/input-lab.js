"use strict";

const sqlExample = LabSimulation.describeQuery(LabSimulation.sqlExample);
const xssExample = LabSimulation.simulateComment(LabSimulation.xssExample.text, LabSimulation.xssExample.showBanner);

const lessons = {
  sql: {
    title: "SQL injection",
    category: "Database security",
    icon: "database-icon",
    intro: "SQL is a language for asking a database for information. In this lesson, a school catalog uses it to find an item.",
    exampleTitle: "Read a simple search query",
    scenario: "A student searches for Notebook. This query shows what a normal search asks the catalog to find.",
    exampleLabel: "Example SQL query",
    exampleCode: "SELECT item_name\nFROM catalog\nWHERE item_name = 'Notebook';",
    exampleParts: [
      ["SELECT item_name", "Return the name of each matching item."],
      ["FROM catalog", "Look in the school supply catalog."],
      ["WHERE item_name = 'Notebook'", "Keep the rows whose item name is Notebook."]
    ],
    exampleResult: "The search returns one row containing Notebook.",
    demoIntro: "SQL injection happens when input can change a query’s instructions. The bracketed words show the change this simulation models.",
    demoLabel: "Search box",
    demoInput: sqlExample.input,
    traceTitle: "From search box to database",
    fixTitle: "Keep the search value in a parameter",
    fixCopy: "@search is a placeholder for the search text. The database compares that value using the same filter. LOWER makes the comparison ignore capital letters.",
    fixCode: sqlExample.statement,
    sourceLabel: "OWASP guide to preventing SQL injection",
    source: "https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html",
    questions: [
      {
        prompt: "Why did the unsafe search return all four items?",
        choices: ["The catalog had four items with the same name.", "The simulated instruction changed the matching rule.", "Searches always show the full catalog."],
        correct: 1,
        feedback: "The simulated instruction made the matching rule true for every row."
      },
      {
        prompt: "Which part of the protected query holds the search value?",
        choices: ["The @search parameter.", "The table name.", "The name of the column being returned."],
        correct: 0,
        feedback: "Binding the value keeps the input separate from the query instructions."
      },
      {
        prompt: "What did the protected search do with the bracketed words?",
        choices: ["It made every item match.", "It dropped the phrase and returned the notebook.", "It searched for the whole value as an item name."],
        correct: 2,
        feedback: "The whole search value was treated as text. No item had that name."
      }
    ]
  },
  xss: {
    title: "Stored cross-site scripting",
    category: "Browser security",
    icon: "browser-icon",
    intro: "A discussion board saves a comment so someone else can read it later. The browser then displays it on the page.",
    exampleTitle: "Show a saved comment",
    scenario: "A student posts “Great explanation!” The board saves the comment and a second student opens the discussion.",
    exampleLabel: "Example JavaScript for plain text",
    exampleCode: "commentElement.textContent = savedComment;",
    exampleParts: [
      ["savedComment", "The comment that the discussion board saved."],
      ["commentElement", "The place on the page where the reader will see it."],
      ["textContent", "Displays the saved value as plain text."]
    ],
    exampleResult: "The second student sees “Great explanation!” on the page.",
    demoIntro: "Stored cross-site scripting (XSS) happens when a website saves content that can run as code in another reader’s browser. The bracketed words show the effect modeled in this demo.",
    demoLabel: "Comment box",
    demoInput: xssExample.value,
    traceTitle: "From author to reader",
    fixTitle: "Display saved comments as text",
    fixCopy: "Use textContent when a comment is meant to be plain text. It displays the full saved value in the reader’s page.",
    fixCode: "commentElement.textContent = savedComment;",
    sourceLabel: "OWASP guide to preventing cross-site scripting",
    source: "https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html",
    questions: [
      {
        prompt: "What makes this example stored XSS?",
        choices: ["The browser saves the banner as an image.", "A reader has to type the code themselves.", "The site saves the comment and serves it to a later reader."],
        correct: 2,
        feedback: "The comment persists in the application and reaches the reader when they open the discussion."
      },
      {
        prompt: "How should a plain-text comment be rendered?",
        choices: ["Parse the comment as page markup.", "Assign it with textContent on an ordinary element.", "Change the color of the comment."],
        correct: 1,
        feedback: "On an ordinary element, textContent places the comment on the page as text."
      },
      {
        prompt: "When did the simulated banner appear?",
        choices: ["While the author was typing.", "When the board saved the comment.", "When another reader opened the page."],
        correct: 2,
        feedback: "Both modes saved the same comment. The difference appeared when the reader’s browser displayed it."
      }
    ]
  }
};

const storageKey = "input-lab.best-scores.v1";
const homeView = document.getElementById("home");
const lessonView = document.getElementById("lesson");
const lessonTemplate = document.getElementById("lesson-template");
const bestScores = loadProgress();
let activeLesson = "";

function loadProgress() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey)) ?? {};
    return Object.fromEntries(
      Object.keys(lessons)
        .filter(id => Number.isInteger(stored[id]) && stored[id] >= 0 && stored[id] <= lessons[id].questions.length)
        .map(id => [id, stored[id]])
    );
  } catch {
    return {};
  }
}

function updateProgress() {
  const ids = Object.keys(lessons);
  const completed = ids.filter(id => bestScores[id] === lessons[id].questions.length).length;
  document.getElementById("progress-label").textContent = `${completed} of ${ids.length} complete`;
  document.getElementById("progress-fill").style.width = `${(completed / ids.length) * 100}%`;

  for (const id of ids) {
    const score = bestScores[id];
    const questionCount = lessons[id].questions.length;
    const status = document.getElementById(`${id}-status`);
    status.textContent = score === questionCount ? "Completed" : score === undefined ? "" : `Best score ${score}/${questionCount}`;
  }

  const next = ids.find(id => bestScores[id] !== lessons[id].questions.length);
  const start = document.getElementById("start-learning");
  start.href = next ? `#${next}` : "#lessons";
  start.textContent = completed === 0 ? "Start learning" : next ? "Continue learning" : "Review lessons";
}

function saveScore(id, score) {
  if (bestScores[id] !== undefined && bestScores[id] >= score) return;
  bestScores[id] = score;
  try {
    localStorage.setItem(storageKey, JSON.stringify(bestScores));
  } catch {
    // The current page still keeps progress when storage is unavailable.
  }
  updateProgress();
}

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function addChoices(fieldset, name, choices) {
  const options = choices.map((choice, index) => {
    const label = element("label", undefined, "option");
    const input = element("input");
    input.type = "radio";
    input.name = name;
    input.value = String(index);
    input.required = true;
    label.append(input, element("span", choice));
    return label;
  });
  fieldset.append(...options);
}

function renderLesson(id) {
  const lesson = lessons[id];
  const isSearch = id === "sql";
  lessonView.replaceChildren(lessonTemplate.content.cloneNode(true));
  const view = name => lessonView.querySelector(`[data-view="${name}"]`);
  const action = name => lessonView.querySelector(`[data-action="${name}"]`);
  const quizForm = lessonView.querySelector("#quiz-form");
  const practiceLink = view("playground-link");

  const content = {
    category: lesson.category,
    title: lesson.title,
    intro: lesson.intro,
    scenario: lesson.scenario,
    "example-title": lesson.exampleTitle,
    "example-label": lesson.exampleLabel,
    "example-code": lesson.exampleCode,
    "example-result": lesson.exampleResult,
    "demo-intro": lesson.demoIntro,
    "demo-label": lesson.demoLabel,
    "demo-input": lesson.demoInput,
    "fix-title": lesson.fixTitle,
    "fix-copy": lesson.fixCopy,
    "fix-code": lesson.fixCode,
    "source-link": lesson.sourceLabel
  };

  for (const [key, value] of Object.entries(content)) view(key).textContent = value;
  view("icon").classList.add(lesson.icon);
  view("source-link").href = lesson.source;
  practiceLink.hash = id;
  const partsList = view("example-parts");
  for (const [term, explanation] of lesson.exampleParts) {
    const part = element("div");
    const name = element("dt");
    name.append(element("code", term));
    part.append(name, element("dd", explanation));
    partsList.append(part);
  }

  const questionFields = lesson.questions.map((question, index) => {
    const field = element("fieldset");
    field.append(element("legend", `${index + 1}. ${question.prompt}`));
    addChoices(field, `question-${index}`, question.choices);
    const feedback = element("p", undefined, "question-feedback");
    feedback.hidden = true;
    field.append(feedback);
    view("questions").append(field);
    return { field, feedback };
  });

  function setStep(step, focus = true) {
    let heading;
    for (const panel of lessonView.querySelectorAll("[data-panel]")) {
      panel.hidden = panel.dataset.panel !== step;
      if (!panel.hidden) heading = panel.querySelector("h2");
    }
    for (const item of lessonView.querySelectorAll("[data-step]")) {
      if (item.dataset.step === step) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
    }
    if (focus) heading.focus();
  }

  action("demo").addEventListener("click", () => setStep("demo"));
  action("example").addEventListener("click", () => setStep("example"));
  action("quiz").addEventListener("click", () => setStep("quiz"));
  action("review").addEventListener("click", () => setStep("demo"));

  const quizSubmit = quizForm.querySelector("button[type=submit]");
  const nextLink = view("next-lesson");
  quizForm.addEventListener("submit", event => {
    event.preventDefault();
    const answers = new FormData(quizForm);
    let score = 0;
    questionFields.forEach(({ field, feedback }, index) => {
      const question = lesson.questions[index];
      const correct = Number(answers.get(`question-${index}`)) === question.correct;
      if (correct) score += 1;
      feedback.dataset.correct = correct;
      feedback.textContent = correct
        ? `Correct. ${question.feedback}`
        : `Correct answer: ${question.choices[question.correct]} ${question.feedback}`;
      feedback.hidden = false;
      field.disabled = true;
    });

    const total = questionFields.length;
    const passed = score === total;
    saveScore(id, score);
    quizSubmit.disabled = true;
    view("quiz-score").textContent = `${score} of ${total} correct`;
    view("quiz-message").textContent = passed ? "Lesson complete." : "Use the feedback above and try again. A full score completes the lesson.";
    action("retry").hidden = passed;
    nextLink.href = isSearch ? "#xss" : "#lessons";
    nextLink.textContent = isSearch ? "Next lesson" : "All lessons";
    nextLink.hidden = !passed;
    practiceLink.hidden = !passed;
    view("quiz-result").hidden = false;
    view("quiz-score").focus();
  });

  action("retry").addEventListener("click", () => {
    for (const { field, feedback } of questionFields) {
      field.disabled = false;
      feedback.hidden = true;
    }
    quizSubmit.disabled = false;
    view("quiz-result").hidden = true;
    lessonView.querySelector('[data-panel="quiz"] h2').focus();
  });

  const walkthrough = isSearch ? LabSimulation.queryTrace(LabSimulation.sqlExample) : LabSimulation.commentTrace(xssExample);
  LabSimulation.mountTrace(view("guided-trace"), walkthrough, {
    title: lesson.traceTitle,
    onComplete() {
      view("fix").hidden = false;
      action("quiz").hidden = false;
    }
  });
  setStep("example", false);
  view("title").focus({ preventScroll: true });
}

function syncRoute(initial = false) {
  const hash = window.location.hash.slice(1);
  if (Object.hasOwn(lessons, hash)) {
    homeView.hidden = true;
    lessonView.hidden = false;
    document.title = `${lessons[hash].title} | Input Lab`;
    if (hash !== activeLesson) renderLesson(hash);
    activeLesson = hash;
    window.scrollTo(0, 0);
    return;
  }

  homeView.hidden = false;
  lessonView.hidden = true;
  activeLesson = "";
  document.title = "Input Lab | Ethical hacking lessons";
  if (hash === "lessons") {
    document.getElementById("lessons-title").focus({ preventScroll: true });
    document.getElementById("lessons").scrollIntoView();
  } else if (!initial) {
    document.querySelector(".wordmark").focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
}

document.querySelector(".skip-link").addEventListener("click", event => {
  event.preventDefault();
  document.getElementById("main").focus();
});
window.addEventListener("hashchange", () => syncRoute());
updateProgress();
syncRoute(true);
