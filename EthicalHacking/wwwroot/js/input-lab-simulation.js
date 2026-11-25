"use strict";

const LabSimulation = (() => {
  const tables = {
    catalog: {
      label: "School supply catalog",
      columns: [
        { name: "item_name", label: "Item name" },
        { name: "category", label: "Category" },
        { name: "shelf", label: "Shelf" }
      ],
      rows: [
        { item_name: "Notebook", category: "Stationery", shelf: "A1" },
        { item_name: "Desk lamp", category: "Electronics", shelf: "B2" },
        { item_name: "Water bottle", category: "Accessories", shelf: "C1" },
        { item_name: "Canvas tote", category: "Accessories", shelf: "C2" }
      ]
    },
    workshops: {
      label: "Workshop schedule",
      columns: [
        { name: "title", label: "Title" },
        { name: "topic", label: "Topic" },
        { name: "room", label: "Room" }
      ],
      rows: [
        { title: "Intro to SQL", topic: "Data", room: "Lab 1" },
        { title: "Building forms", topic: "Web", room: "Lab 2" },
        { title: "Reading query results", topic: "Data", room: "Lab 1" },
        { title: "Page rendering", topic: "Web", room: "Lab 3" }
      ]
    }
  };
  const sqlExample = {
    table: "catalog", columns: ["item_name"], field: "item_name",
    operator: "equals", value: "notebook", broaden: true
  };
  const xssExample = { text: "Great explanation!", showBanner: true };

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function describeQuery(query) {
    const table = Object.hasOwn(tables, query.table) ? tables[query.table] : null;
    const field = table?.columns.find(column => column.name === query.field);
    if (!field || !["equals", "contains"].includes(query.operator)) {
      throw new Error("Choose a supported table, filter column, and comparison.");
    }

    const columns = table.columns.filter(column => query.columns.includes(column.name));
    const names = columns.map(column => column.name).join(", ");
    const contains = query.operator === "contains";
    const fieldSql = `LOWER(${field.name})`;
    const condition = contains
      ? `POSITION(LOWER(@search) IN ${fieldSql}) > 0`
      : `${fieldSql} = LOWER(@search)`;
    const marker = query.table === "catalog" ? "⟦make every item match⟧" : "⟦make every row match⟧";

    return {
      table,
      columns,
      statement: columns.length ? `SELECT ${names}\nFROM ${query.table}\nWHERE ${condition};` : "",
      intendedRule: `${field.label} ${contains ? "contains" : "equals"} the search value.`,
      input: query.broaden ? `${query.value} ${marker}` : query.value
    };
  }

  function simulateQuery(query) {
    const plan = describeQuery(query);
    const input = plan.input.toLowerCase();
    const matches = plan.table.rows.filter(row => {
      const cell = row[query.field].toLowerCase();
      return query.operator === "contains" ? cell.includes(input) : cell === input;
    });
    return { ...plan, unsafeRows: query.broaden ? plan.table.rows : matches, protectedRows: matches };
  }

  function simulateComment(text, showBanner) {
    return {
      text,
      showBanner,
      value: showBanner ? `${text} ⟦show a banner⟧` : text
    };
  }

  function queryTrace(query) {
    const result = simulateQuery(query);
    const { input, statement, table, columns, unsafeRows, protectedRows } = result;
    const selectedColumns = columns.map(column => column.label).join(", ");
    const matchingLabel = rows => `${rows.length} ${rows.length === 1 ? "row matches" : "rows match"}`;
    const resultTable = rows => ({ columns, rows });
    const databaseTable = { columns: table.columns, rows: table.rows };
    return [
      {
        title: "Intended query",
        explanation: `Both modes start with the same search against the ${table.label.toLowerCase()}.`,
        unsafe: {
          heading: "The application’s search rule",
          detail: `Return ${selectedColumns}. ${result.intendedRule}`
        },
        protected: { heading: "A fixed query template", detail: result.intendedRule, code: statement }
      },
      {
        title: "Input handling",
        explanation: query.broaden
          ? "The bracketed marker represents a change to the search rule. In the protected path, the entire value is bound to the parameter."
          : "This ordinary value is used in the comparison in both paths. The protected path explicitly binds it as data.",
        unsafe: {
          heading: query.broaden ? "Modeled rule: match every row" : "The intended filter still applies",
          detail: query.broaden ? "The simulation treats the marker as an instruction and broadens the search." : result.intendedRule,
          code: input
        },
        protected: {
          heading: "Query structure stays fixed",
          detail: "The database uses the full value in the existing filter.",
          code: `@search = ${JSON.stringify(input)}`
        }
      },
      {
        title: "Query results",
        explanation: query.broaden
          ? "The simulated rule accepts every row. The protected query still compares each row with the full input."
          : "Both modes apply the same comparison to this ordinary input. Each result shows only the columns you selected.",
        unsafe: { heading: matchingLabel(unsafeRows), table: resultTable(unsafeRows) },
        protected: { heading: matchingLabel(protectedRows), table: resultTable(protectedRows) }
      },
      {
        title: "Database state",
        explanation: `This search reads data. The ${table.rows.length} stored rows stay the same before and after in both modes.`,
        snapshots: databaseTable
      }
    ];
  }

  function commentTrace(comment) {
    const saved = { heading: "Comment #1", detail: "The discussion board has saved the full comment for later readers.", code: comment.value };
    return [
      {
        title: "Author enters a comment",
        explanation: comment.showBanner
          ? "The bracketed marker represents browser instructions in this exercise. Both modes receive the same comment."
          : "The author writes one comment. Each view receives the same text.",
        unsafe: { heading: "Submitted comment", code: comment.value },
        protected: { heading: "Submitted comment", code: comment.value }
      },
      {
        title: "Discussion board saves it",
        explanation: "The author can leave the page. The saved comment will be delivered when someone else opens the discussion.",
        unsafe: saved,
        protected: saved
      },
      {
        title: "Another reader opens the page",
        explanation: comment.showBanner
          ? "The handling changes at render time. The unsafe preview models a page change, while the protected preview displays the full saved text."
          : "Both views show the ordinary comment. The protected view uses a text-only rendering API for every comment.",
        unsafe: {
          heading: comment.showBanner ? "A banner appears in the simulation" : "Reader sees the comment",
          code: comment.showBanner ? comment.text : comment.value,
          banner: comment.showBanner
        },
        protected: {
          heading: "Reader sees the full comment as text",
          detail: "Using textContent on a plain-text comment element keeps the saved value visible as text.",
          code: comment.value
        }
      }
    ];
  }

  function renderTable({ columns, rows }, caption, className) {
    const container = element("div", undefined, "trace-table-wrap");
    const table = element("table", undefined, `trace-table ${className}`);
    table.append(element("caption", caption));
    const headings = table.createTHead().insertRow();
    for (const column of columns) {
      const heading = element("th", column.label);
      heading.scope = "col";
      headings.append(heading);
    }
    const body = table.createTBody();
    for (const row of rows) {
      const resultRow = body.insertRow();
      for (const column of columns) resultRow.append(element("td", row[column.name]));
    }
    container.append(table);
    return container;
  }

  function renderPane(mode, pane) {
    const card = element("section", undefined, `trace-pane trace-${mode}`);
    const label = mode === "unsafe" ? "Unsafe simulation" : "Protected";
    card.append(element("p", label, "trace-mode"), element("h5", pane.heading));
    if (pane.detail) card.append(element("p", pane.detail, "section-copy"));
    if (pane.code !== undefined) card.append(element("pre", pane.code, "trace-code"));
    if (pane.banner) card.append(element("p", "Classroom demo banner", "demo-banner"));
    if (pane.table) {
      if (pane.table.rows.length) card.append(renderTable(pane.table, `${label} results`, "trace-matches"));
      else card.append(element("p", "The result set is empty.", "trace-empty"));
    }
    return card;
  }

  function mountTrace(container, steps, { title, onComplete } = {}) {
    const heading = element("h3", title ?? "Compare both modes", "trace-heading");
    const timeline = element("ol", undefined, "trace-timeline");
    timeline.setAttribute("aria-label", "Walkthrough steps");
    const milestones = steps.map((step, index) => {
      const item = element("li");
      const number = element("span", String(index + 1));
      number.setAttribute("aria-hidden", "true");
      item.append(number, document.createTextNode(step.title));
      return item;
    });
    timeline.append(...milestones);

    const stage = element("div", undefined, "trace-stage");
    const summary = element("div", undefined, "trace-summary");
    summary.setAttribute("role", "status");
    const stepTitle = element("h4");
    stepTitle.tabIndex = -1;
    const explanation = element("p", undefined, "section-copy");
    summary.append(stepTitle, explanation);
    const results = element("div", undefined, "trace-results");
    stage.append(summary, results);

    const actions = element("div", undefined, "trace-actions");
    const back = element("button", "Back", "button button-outline");
    const next = element("button", "Next", "button button-primary");
    const replay = element("button", "Replay", "button button-outline");
    for (const button of [back, next, replay]) button.type = "button";
    actions.append(back, next, replay);
    container.replaceChildren(heading, timeline, stage, actions);

    let current = 0;
    function show(index, focus = false) {
      const step = steps[index];
      if (!step) return;
      current = index;
      stepTitle.textContent = `Step ${index + 1} of ${steps.length} · ${step.title}`;
      explanation.textContent = step.explanation;
      milestones.forEach((item, position) => {
        if (position === index) item.setAttribute("aria-current", "step");
        else item.removeAttribute("aria-current");
      });

      const pair = element("div", undefined, "trace-pair");
      if (step.snapshots) {
        for (const label of ["Before the search", "After the search"]) {
          const card = element("section", undefined, "trace-pane trace-snapshot");
          card.append(element("h5", label), renderTable(step.snapshots, "Stored rows", ""));
          pair.append(card);
        }
      } else {
        pair.append(renderPane("unsafe", step.unsafe), renderPane("protected", step.protected));
      }
      results.replaceChildren(pair);
      const last = index === steps.length - 1;
      const focusedButton = document.activeElement;
      back.disabled = index === 0;
      next.disabled = last;
      if (focus || (focusedButton === back && back.disabled) || (focusedButton === next && next.disabled)) {
        stepTitle.focus({ preventScroll: !focus });
      }
      if (last) onComplete?.();
    }

    back.addEventListener("click", () => show(current - 1));
    next.addEventListener("click", () => show(current + 1));
    replay.addEventListener("click", () => show(0));
    show(0);
    return { show };
  }

  return { tables, sqlExample, xssExample, describeQuery, simulateQuery, simulateComment, queryTrace, commentTrace, mountTrace };
})();
