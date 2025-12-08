const fs = require('fs');
const path = require('path');

function extractCentroids(filePath, varName) {
  const src = fs.readFileSync(filePath, 'utf8');
  const regex = new RegExp(varName + '\\s*:\\s*\\{([\\s\\S]*?)\\}\\s*;', 'm');
  const match = src.match(regex);
  if (!match) return {};
  const body = match[1];

  // Match lines like: 'Name': [16.410, 120.585],
  const lineRegex = /['\"]([^'\"]+)['\"]\s*:\s*\[\s*([-0-9.]+)\s*,\s*([-0-9.]+)\s*\]\s*,?/g;
  const res = {};
  let m;
  while ((m = lineRegex.exec(body)) !== null) {
    const key = m[1];
    const lat = parseFloat(m[2]);
    const lng = parseFloat(m[3]);
    res[key] = [lat, lng];
  }
  return res;
}

function checkCentroids(centroids, bounds) {
  const issues = [];
  Object.entries(centroids).forEach(([k, v]) => {
    const [lat, lng] = v;
    const latOk = lat >= bounds.latMin && lat <= bounds.latMax;
    const lngOk = lng >= bounds.lngMin && lng <= bounds.lngMax;
    const swappedLatOk = lat >= bounds.lngMin && lat <= bounds.lngMax; // if lat is actually a longitude
    const swappedLngOk = lng >= bounds.latMin && lng <= bounds.latMax; // if lng is actually a latitude

    if (!latOk || !lngOk) {
      const issue = { barangay: k, lat, lng, latOk, lngOk };
      if (!latOk && !lngOk && swappedLatOk && swappedLngOk) {
        issue.swapped = true;
      }
      issues.push(issue);
    }
  });
  return issues;
}

const repoRoot = path.resolve(__dirname, '..');
const mapFile = path.join(repoRoot, 'src', 'app', 'map', 'map.ts');
const reportFile = path.join(repoRoot, 'src', 'app', 'report', 'report.ts');

if (!fs.existsSync(mapFile) || !fs.existsSync(reportFile)) {
  console.error('Required files not found:', mapFile, reportFile);
  process.exit(2);
}

const MAP_VAR = 'BARANGAY_CENTROIDS';

const mapCentroids = extractCentroids(mapFile, MAP_VAR);
const reportCentroids = extractCentroids(reportFile, MAP_VAR);

console.log('Found', Object.keys(mapCentroids).length, 'centroids in map.ts');
console.log('Found', Object.keys(reportCentroids).length, 'centroids in report.ts');

// Baguio approximate ranges
const bounds = {
  latMin: 16.35,
  latMax: 16.48,
  lngMin: 120.52,
  lngMax: 120.66,
};

const mapIssues = checkCentroids(mapCentroids, bounds);
const reportIssues = checkCentroids(reportCentroids, bounds);

function summarizeIssues(name, issues) {
  if (issues.length === 0) {
    console.log(`No range/swapped issues detected in ${name}.`);
    return;
  }
  console.log(`Issues in ${name}:`);
  issues.forEach((it) => {
    if (it.swapped) {
      console.log(`  - ${it.barangay}: coordinates appear swapped (lat=${it.lat}, lng=${it.lng})`);
    } else {
      console.log(`  - ${it.barangay}: out-of-range (lat=${it.lat}, lng=${it.lng})`);
    }
  });
}

summarizeIssues('map.ts', mapIssues);
summarizeIssues('report.ts', reportIssues);

// Compare differences between the tables
const allKeys = new Set([...Object.keys(mapCentroids), ...Object.keys(reportCentroids)]);
const diffs = [];
allKeys.forEach((k) => {
  const a = mapCentroids[k];
  const b = reportCentroids[k];
  if (!a || !b) {
    diffs.push({ barangay: k, map: a, report: b, reason: 'missing_in_one' });
    return;
  }
  const diffLat = Math.abs(a[0] - b[0]);
  const diffLng = Math.abs(a[1] - b[1]);
  if (diffLat > 0.001 || diffLng > 0.001) {
    diffs.push({ barangay: k, map: a, report: b, reason: 'coords_mismatch', diffLat, diffLng });
  }
});

if (diffs.length === 0) {
  console.log('No coordinate mismatches between map.ts and report.ts centroid lists.');
} else {
  console.log('Coordinate differences between map.ts and report.ts:');
  diffs.forEach((d) => {
    if (d.reason === 'missing_in_one') {
      console.log(`  - ${d.barangay}: present in ${d.map ? 'map.ts' : ''}${d.map && d.report ? '' : ''}${d.report ? 'report.ts' : ''}`);
    } else {
      console.log(`  - ${d.barangay}: map.ts=${d.map}, report.ts=${d.report} (dLat=${d.diffLat.toFixed(4)}, dLng=${d.diffLng.toFixed(4)})`);
    }
  });
}

// If you want JSON output to process later
const out = {
  mapCount: Object.keys(mapCentroids).length,
  reportCount: Object.keys(reportCentroids).length,
  mapIssues,
  reportIssues,
  diffs,
};
fs.writeFileSync(path.join(repoRoot, 'scripts', 'barangay-centroids-validation.json'), JSON.stringify(out, null, 2));
console.log('Validation JSON written to scripts/barangay-centroids-validation.json');
