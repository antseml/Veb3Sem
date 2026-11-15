var STORAGE_KEY = "lab1_results";

var xInput = document.getElementById("xInput");
var yInput = document.getElementById("yInput");
var rInput = document.getElementById("rInput");
var xError = document.getElementById("xError");
var yError = document.getElementById("yError");
var rError = document.getElementById("rError");
var submitBtn = document.getElementById("submitBtn");
var clearBtn = document.getElementById("clearBtn");
var resultsBody = document.getElementById("resultsBody");
var canvas = document.getElementById("canvasBox");
var ctx = canvas.getContext("2d");

function parseNumber(str) {
  if (str === null) return null;
  str = str.trim().replace(",", ".");
  if (str === "") return null;
  if (!/^-?\d+(\.\d+)?$/.test(str)) return null;
  var val = Number(str);
  if (!isFinite(val)) return null;
  return val;
}

function validateField(input, errorEl, min, max, allowNegativeNote) {
  var raw = input.value;
  var val = parseNumber(raw);
  if (raw.trim() === "") {
    input.classList.remove("invalid");
    errorEl.textContent = "";
    return null;
  }
  if (val === null) {
    input.classList.add("invalid");
    errorEl.textContent = "Допустимо только число (например: -1.5)";
    return null;
  }
  if (val < min || val > max) {
    input.classList.add("invalid");
    errorEl.textContent =
      "Значение должно быть в диапазоне от " + min + " до " + max;
    return null;
  }
  input.classList.remove("invalid");
  errorEl.textContent = "";
  return val;
}

function validateAll() {
  var x = validateField(xInput, xError, -5, 5);
  var y = validateField(yInput, yError, -5, 5);
  var r = validateField(rInput, rError, 1, 4);
  var allFilled =
    xInput.value.trim() !== "" &&
    yInput.value.trim() !== "" &&
    rInput.value.trim() !== "";
  var allValid = x !== null && y !== null && r !== null;
  submitBtn.disabled = !(allFilled && allValid);
  return { x: x, y: y, r: r, ok: allFilled && allValid };
}

xInput.addEventListener("input", validateAll);
yInput.addEventListener("input", validateAll);
rInput.addEventListener("input", validateAll);

function toFraction(str) {
  str = str.trim().replace(",", ".");
  var neg = str.charAt(0) === "-";
  if (neg) str = str.slice(1);
  var parts = str.split(".");
  var intPart = parts[0] || "0";
  var fracPart = parts[1] || "";
  var digits = intPart + fracPart;
  var num = BigInt(digits === "" ? "0" : digits);
  var den = 10n ** BigInt(fracPart.length);
  if (neg) num = -num;
  return { num: num, den: den };
}

function fInt(n) {
  return { num: BigInt(n), den: 1n };
}

function fAdd(a, b) {
  return { num: a.num * b.den + b.num * a.den, den: a.den * b.den };
}

function fMul(a, b) {
  return { num: a.num * b.num, den: a.den * b.den };
}

function fDivInt(a, n) {
  return { num: a.num, den: a.den * BigInt(n) };
}

function fDiv(a, b) {
  return { num: a.num * b.den, den: a.den * b.num };
}

function fCmp(a, b) {
  var diff = a.num * b.den - b.num * a.den;
  if (diff > 0n) return 1;
  if (diff < 0n) return -1;
  return 0;
}

function fLe(a, b) {
  return fCmp(a, b) <= 0;
}

function fGe(a, b) {
  return fCmp(a, b) >= 0;
}

function inArea(xStr, yStr, rStr) {
  var x = toFraction(xStr);
  var y = toFraction(yStr);
  var r = toFraction(rStr);
  var zero = fInt(0);
  var one = fInt(1);
  var negHalfR = fDivInt({ num: -r.num, den: r.den }, 2);
  var halfR = fDivInt(r, 2);

  if (fGe(x, negHalfR) && fLe(x, zero) && fGe(y, zero) && fLe(y, r)) {
    return true;
  }

  if (
    fLe(x, zero) &&
    fLe(y, zero) &&
    fLe(fAdd(fMul(x, x), fMul(y, y)), fMul(r, r))
  ) {
    return true;
  }

  if (fGe(x, zero) && fLe(y, zero)) {
    var negY = { num: -y.num, den: y.den };
    var termX = fDiv(x, r);
    var termY = fDiv(negY, halfR);
    if (fLe(fAdd(termX, termY), one)) {
      return true;
    }
  }

  return false;
}

function drawArea(r) {
  var w = canvas.width;
  var h = canvas.height;
  var scale = (w / 2 - 20) / (r || 4);
  var cx = w / 2;
  var cy = h / 2;

  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = "#4a90d9";

  if (r > 0) {
    ctx.beginPath();
    ctx.rect(
      cx + (-r / 2) * scale,
      cy + -r * scale,
      (r / 2) * scale,
      r * scale,
    );
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r * scale, Math.PI / 2, Math.PI);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * scale, cy);
    ctx.lineTo(cx, cy + (r / 2) * scale);
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = "#333";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.lineTo(w, cy);
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, h);
  ctx.stroke();

  ctx.fillStyle = "#000";
  ctx.font = "12px sans-serif";

  if (r > 0) {
    ctx.textAlign = "center";

    ctx.textBaseline = "top";
    ctx.fillText("-R", cx - r * scale, cy + 6);
    ctx.fillText("-R/2", cx - (r / 2) * scale, cy + 6);
    ctx.fillText("R/2", cx + (r / 2) * scale, cy + 6);
    ctx.fillText("R", cx + r * scale, cy + 6);

    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText("R", cx - 6, cy - r * scale);
    ctx.fillText("R/2", cx - 6, cy - (r / 2) * scale);
    ctx.fillText("-R/2", cx - 6, cy + (r / 2) * scale);
    ctx.fillText("-R", cx - 6, cy + r * scale);

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
}

function plotPoint(x, y, r, hit) {
  var w = canvas.width;
  var h = canvas.height;
  var scale = (w / 2 - 20) / (r || 4);
  var cx = w / 2;
  var cy = h / 2;
  var px = cx + x * scale;
  var py = cy - y * scale;

  ctx.fillStyle = hit ? "#1a7a1a" : "#c0392b";
  ctx.beginPath();
  ctx.arc(px, py, 4, 0, 2 * Math.PI);
  ctx.fill();
}

// rInput.addEventListener("input", function () {
//     var r = parseNumber(rInput.value);
//     drawArea(r !== null && r >= 1 && r <= 4 ? r : 4);
// });

function formatDate(date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function loadResults() {
  var raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    var arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr;
  } catch (e) {
    return [];
  }
}

function saveResults(arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

function renderRow(entry) {
  var tr = document.createElement("tr");

  var tdX = document.createElement("td");
  tdX.textContent = entry.x;
  tr.appendChild(tdX);

  var tdY = document.createElement("td");
  tdY.textContent = entry.y;
  tr.appendChild(tdY);

  var tdR = document.createElement("td");
  tdR.textContent = entry.r;
  tr.appendChild(tdR);

  var tdRes = document.createElement("td");
  tdRes.textContent = entry.hit ? "Попадание" : "Промах";
  tdRes.className = entry.hit ? "hit" : "miss";
  tr.appendChild(tdRes);

  var tdDate = document.createElement("td");
  tdDate.textContent = formatDate(new Date(entry.ts));
  tr.appendChild(tdDate);

  resultsBody.appendChild(tr);
}

function renderAll() {
  resultsBody.innerHTML = "";
  var arr = loadResults();
  for (var i = 0; i < arr.length; i++) {
    renderRow(arr[i]);
  }
}

submitBtn.addEventListener("click", function () {
  var v = validateAll();
  if (!v.ok) return;

  var hit = inArea(
    xInput.value.trim(),
    yInput.value.trim(),
    rInput.value.trim(),
  );
  var entry = {
    x: xInput.value.trim(),
    y: yInput.value.trim(),
    r: rInput.value.trim(),
    hit: hit,
    ts: new Date().toISOString(),
  };

  var arr = loadResults();
  arr.push(entry);
  saveResults(arr);
  renderRow(entry);

  drawArea(v.r);
  plotPoint(v.x, v.y, v.r, hit);
});

clearBtn.addEventListener("click", function () {
  localStorage.removeItem(STORAGE_KEY);
  resultsBody.innerHTML = "";
});

drawArea(4);
renderAll();
validateAll();
