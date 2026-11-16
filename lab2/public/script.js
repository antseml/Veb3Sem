"use strict";

var API_URL = "/fcgi-bin/lab2.jar";

var xInput = document.getElementById("xInput");
var yCheckboxes = Array.prototype.slice.call(
  document.querySelectorAll('input[name="y"]'),
);
var yCheckboxesBox = document.getElementById("yCheckboxes");
var rInput = document.getElementById("rInput");
var xError = document.getElementById("xError");
var yError = document.getElementById("yError");
var rError = document.getElementById("rError");
var submitBtn = document.getElementById("submitBtn");
var requestStatus = document.getElementById("requestStatus");
var resultsBody = document.getElementById("resultsBody");
var canvas = document.getElementById("canvasBox");
var ctx = canvas.getContext("2d");
var historyEntries = [];

function parseNumber(str) {
  if (str === null) return null;
  str = str.trim().replace(",", ".");
  if (str === "") return null;
  if (!/^-?\d+(\.\d+)?$/.test(str)) return null;
  var value = Number(str);
  return isFinite(value) ? value : null;
}

function selectedY() {
  for (var i = 0; i < yCheckboxes.length; i++) {
    if (yCheckboxes[i].checked) return yCheckboxes[i].value;
  }
  return null;
}

function validateX() {
  var raw = xInput.value;
  var value = parseNumber(raw);

  if (raw.trim() === "") {
    xInput.classList.remove("invalid");
    xError.textContent = "";
    return null;
  }
  if (value === null) {
    xInput.classList.add("invalid");
    xError.textContent = "Допустимо только число (например: -1.5)";
    return null;
  }
  if (value < -3 || value > 3) {
    xInput.classList.add("invalid");
    xError.textContent = "X должен быть в диапазоне от -3 до 3";
    return null;
  }

  xInput.classList.remove("invalid");
  xError.textContent = "";
  return value;
}

function validateY() {
  var value = selectedY();
  if (value === null) {
    yCheckboxesBox.classList.add("invalid");
    yError.textContent = "Выберите одно значение Y";
    return null;
  }
  yCheckboxesBox.classList.remove("invalid");
  yError.textContent = "";
  return Number(value);
}

function validateR() {
  var value = parseNumber(rInput.value);
  var allowed = [1, 1.5, 2, 2.5, 3];
  if (value === null || allowed.indexOf(value) === -1) {
    rError.textContent = "Выберите допустимое значение R";
    return null;
  }
  rError.textContent = "";
  return value;
}

function validateAll(showEmptyErrors) {
  var x = validateX();
  var y = showEmptyErrors ? validateY() : selectedY();
  var r = validateR();
  var xFilled = xInput.value.trim() !== "";
  var yFilled = selectedY() !== null;
  var ok = xFilled && yFilled && x !== null && r !== null;
  submitBtn.disabled = !ok;
  return {
    x: x,
    y: y === null ? null : Number(y),
    r: r,
    ok: ok,
  };
}

xInput.addEventListener("input", function () {
  validateAll(false);
});

for (var i = 0; i < yCheckboxes.length; i++) {
  yCheckboxes[i].addEventListener("change", function (event) {
    if (event.target.checked) {
      for (var j = 0; j < yCheckboxes.length; j++) {
        if (yCheckboxes[j] !== event.target) yCheckboxes[j].checked = false;
      }
    }
    validateY();
    validateAll(false);
  });
}

rInput.addEventListener("change", function () {
  validateAll(false);
  drawGraph();
});

function drawGraph() {
  var r = Number(rInput.value) || 3;
  var width = canvas.width;
  var height = canvas.height;
  var centerX = width / 2;
  var centerY = height / 2;
  var scale = (width / 2 - 30) / r;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#4a90d9";

  ctx.fillRect(centerX - r * scale, centerY, r * scale, r * scale);

  ctx.beginPath();
  ctx.moveTo(centerX - r * scale, centerY);
  ctx.lineTo(centerX, centerY);
  ctx.lineTo(centerX, centerY - (r / 2) * scale);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(centerX, centerY - (r / 2) * scale);
  ctx.arc(
    centerX,
    centerY,
    (r / 2) * scale,
    -Math.PI / 2,
    0,
    false,
  );
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#333";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(10, centerY);
  ctx.lineTo(width - 10, centerY);
  ctx.lineTo(width - 18, centerY - 4);
  ctx.moveTo(width - 10, centerY);
  ctx.lineTo(width - 18, centerY + 4);
  ctx.moveTo(centerX, height - 10);
  ctx.lineTo(centerX, 10);
  ctx.lineTo(centerX - 4, 18);
  ctx.moveTo(centerX, 10);
  ctx.lineTo(centerX + 4, 18);
  ctx.stroke();

  drawLabels(centerX, centerY, scale, r);
  drawHistoryPoints(centerX, centerY, scale, r);
}

function drawLabels(centerX, centerY, scale, r) {
  ctx.fillStyle = "#000";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("-R", centerX - r * scale, centerY + 6);
  ctx.fillText("-R/2", centerX - (r / 2) * scale, centerY + 6);
  ctx.fillText("R/2", centerX + (r / 2) * scale, centerY + 6);
  ctx.fillText("R", centerX + r * scale, centerY + 6);

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("R", centerX + 6, centerY - r * scale);
  ctx.fillText("R/2", centerX + 6, centerY - (r / 2) * scale);
  ctx.fillText("-R/2", centerX + 6, centerY + (r / 2) * scale);
  ctx.fillText("-R", centerX + 6, centerY + r * scale);
}

function drawHistoryPoints(centerX, centerY, scale, r) {
  for (var i = 0; i < historyEntries.length; i++) {
    var entry = historyEntries[i];
    if (Math.abs(Number(entry.r) - r) > 1e-9) continue;

    ctx.fillStyle = entry.hit ? "#1a7a1a" : "#c0392b";
    ctx.beginPath();
    ctx.arc(
      centerX + Number(entry.x) * scale,
      centerY - Number(entry.y) * scale,
      4,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}

function formatServerTime(value) {
  var date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function renderRow(entry) {
  var row = document.createElement("tr");
  var values = [
    entry.x,
    entry.y,
    entry.r,
    entry.hit ? "Попадание" : "Промах",
    formatServerTime(entry.serverTime),
    (Number(entry.executionTimeNs) / 1000000).toFixed(3) + " мс",
  ];

  for (var i = 0; i < values.length; i++) {
    var cell = document.createElement("td");
    cell.textContent = values[i];
    if (i === 3) cell.className = entry.hit ? "hit" : "miss";
    row.appendChild(cell);
  }
  resultsBody.appendChild(row);
}

function renderAll(entries) {
  historyEntries = Array.isArray(entries) ? entries : [];
  resultsBody.innerHTML = "";
  for (var i = 0; i < historyEntries.length; i++) {
    renderRow(historyEntries[i]);
  }
  drawGraph();
}

function setStatus(message, isError) {
  requestStatus.textContent = message;
  requestStatus.className = isError ? "error" : "";
}

function parseResponse(response) {
  return response.json().catch(function () {
    throw new Error("Сервер вернул некорректный JSON");
  }).then(function (data) {
    if (!response.ok || data.status !== "ok") {
      throw new Error(data.message || "Ошибка сервера");
    }
    return data;
  });
}

function loadHistory() {
  fetch(API_URL + "?history=1", {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  })
    .then(parseResponse)
    .then(function (data) {
      renderAll(data.history);
      setStatus("", false);
    })
    .catch(function (error) {
      setStatus("Не удалось загрузить историю: " + error.message, true);
    });
}

submitBtn.addEventListener("click", function () {
  var values = validateAll(true);
  if (!values.ok) return;

  submitBtn.disabled = true;
  setStatus("Отправка запроса...", false);

  var params = new URLSearchParams({
    x: String(values.x),
    y: String(values.y),
    r: String(values.r),
  });

  fetch(API_URL + "?" + params.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  })
    .then(parseResponse)
    .then(function (data) {
      renderAll(data.history);
      setStatus("Результат получен", false);
    })
    .catch(function (error) {
      setStatus(error.message, true);
    })
    .then(function () {
      validateAll(false);
    });
});

drawGraph();
validateAll(false);
loadHistory();
