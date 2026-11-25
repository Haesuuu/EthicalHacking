"use strict";

function initializeSqlPlayground() {
  const form = document.getElementById("query-form");
  const tableSelect = document.getElementById("query-table");
  const fieldSelect = document.getElementById("query-field");
  const columns = document.getElementById("query-columns");
  const valueInput = document.getElementById("query-value");
  const preview = document.getElementById("query-preview");
  const inputPreview = document.getElementById("query-input-preview");
  const status = document.getElementById("query-status");
  const trace = document.getElementById("query-trace");
  let configuredTable = "";

  for (const [name, table] of Object.entries(LabSimulation.tables)) {
    const selected = name === LabSimulation.sqlExample.table;
    tableSelect.add(new Option(table.label, name, selected, selected));
  }

  function configureColumns(tableName) {
    const definitions = LabSimulation.tables[tableName].columns;
    fieldSelect.replaceChildren(...definitions.map(column => new Option(column.label, column.name)));
    columns.replaceChildren(...definitions.map((column, index) => {
      const label = document.createElement("label");
      const choice = document.createElement("input");
      choice.type = "checkbox";
      choice.name = "column";
      choice.value = column.name;
      choice.defaultChecked = index === 0;
      label.append(choice, document.createTextNode(column.label));
      return label;
    }));
    configuredTable = tableName;
  }

  function readQuery() {
    const data = new FormData(form);
    return {
      table: tableSelect.value,
      columns: data.getAll("column"),
      field: fieldSelect.value,
      operator: data.get("operator"),
      value: valueInput.value.trim(),
      broaden: data.get("scenario") === "broaden"
    };
  }

  function updateDraft() {
    if (tableSelect.value !== configuredTable) configureColumns(tableSelect.value);
    const query = readQuery();
    const description = LabSimulation.describeQuery(query);
    columns.querySelector("input").setCustomValidity(query.columns.length ? "" : "Choose at least one column to return.");
    valueInput.setCustomValidity("");
    preview.textContent = description.statement || "Choose at least one column to preview the query.";
    inputPreview.textContent = query.value ? description.input : "Enter a search value.";
    if (!trace.hidden) {
      trace.hidden = true;
      trace.replaceChildren();
      status.textContent = "Query changed. Run both modes to see the new comparison.";
    }
  }

  form.addEventListener("input", updateDraft);
  form.addEventListener("submit", event => {
    event.preventDefault();
    const query = readQuery();
    valueInput.setCustomValidity(query.value ? "" : "Enter a search value.");
    if (!form.reportValidity()) return;
    const steps = LabSimulation.queryTrace(query);
    trace.hidden = false;
    status.textContent = "";
    LabSimulation.mountTrace(trace, steps);
    trace.querySelector("h4").focus();
  });
  document.getElementById("query-reset").addEventListener("click", () => {
    form.reset();
    configureColumns(tableSelect.value);
    trace.hidden = true;
    trace.replaceChildren();
    updateDraft();
    status.textContent = "SQL playground reset.";
  });

  updateDraft();
}

function initializeCommentPlayground() {
  const form = document.getElementById("comment-form");
  const input = document.getElementById("comment-value");
  const reader = document.getElementById("comment-reader");
  const status = document.getElementById("comment-status");
  const trace = document.getElementById("comment-trace");
  let comparison;
  let readerStep;

  form.addEventListener("input", () => {
    input.setCustomValidity("");
    if (comparison) status.textContent = "Draft changed. The reader still sees the last posted comment.";
  });
  form.addEventListener("submit", event => {
    event.preventDefault();
    const text = input.value.trim();
    input.setCustomValidity(text ? "" : "Enter a comment to post.");
    if (!form.reportValidity()) return;
    const showBanner = new FormData(form).get("scenario") === "banner";
    const steps = LabSimulation.commentTrace(LabSimulation.simulateComment(text, showBanner));
    trace.hidden = false;
    comparison = LabSimulation.mountTrace(trace, steps, { title: "Follow the saved comment" });
    readerStep = steps.length - 1;
    reader.disabled = false;
    status.textContent = "Comment posted. Step through the trace or open it as another reader.";
  });
  reader.addEventListener("click", () => comparison?.show(readerStep, true));
  document.getElementById("comment-reset").addEventListener("click", () => {
    form.reset();
    input.setCustomValidity("");
    comparison = undefined;
    reader.disabled = true;
    trace.hidden = true;
    trace.replaceChildren();
    status.textContent = "XSS playground reset.";
  });
}

const playground = document.getElementById("playground");

function syncExercise(focus = false) {
  const active = window.location.hash === "#xss" ? "xss" : "sql";
  for (const link of playground.querySelectorAll("[data-exercise-link]")) {
    if (link.dataset.exerciseLink === active) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  }
  for (const section of playground.querySelectorAll("[data-exercise]")) {
    section.hidden = section.dataset.exercise !== active;
    if (!section.hidden && focus) section.querySelector("h2").focus({ preventScroll: true });
  }
}

initializeSqlPlayground();
initializeCommentPlayground();
syncExercise();
playground.hidden = false;
window.addEventListener("hashchange", () => syncExercise(true));
document.querySelector(".skip-link").addEventListener("click", event => {
  event.preventDefault();
  document.getElementById("main").focus();
});
