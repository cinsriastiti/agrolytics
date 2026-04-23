// setup firebase
const firebaseConfig = {
    apiKey: "AIzaSyAcgOQlwG7nNT1ULe3OA_1PSN_j6ObFOQc",
    authDomain: "ta-agrolytics.firebaseapp.com",
    projectId: "ta-agrolytics",
    storageBucket: "ta-agrolytics.firebasestorage.app",
    messagingSenderId: "963533651324",
    appId: "1:963533651324:web:d095499fa9e0d8d3ff38f9",
    measurementId: "G-XLHC2P85B1"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// bagian monitoring

async function getSessions() {
    const snapshot = await db
        .collection("agrolytics_monitoring")
        .orderBy("startTime", "desc")
        .get();

    return snapshot.docs;
}

async function getSessionData(sessionId) {
    const snapshot = await db
        .collection("agrolytics_monitoring")
        .doc(sessionId)
        .collection("data")
        .orderBy("timestamp")
        .get();

    return snapshot.docs.map(doc => doc.data());
}

function showSessions(sessions) {
    const tbody = document.getElementById("data-monitor");
    tbody.innerHTML = "";

    sessions.forEach(doc => {
        const data = doc.data();

        const tr = document.createElement("tr");
        tr.style.cursor = "pointer";

        let waktu = "-";
        if (data.startTime) {
            waktu = new Date(data.startTime.seconds * 1000).toLocaleString();
        }

        let location = "-";

        if (data.location) {
            location = `${data.location.latitude}, ${data.location.longitude}`;
        } else {
            location = data.location;
        }


        tr.innerHTML = `
      <td>${waktu}</td>
      <td>${location}</td>
    `;

        tr.onclick = async () => {
            const sessionId = doc.id;
            const dataSession = await getSessionData(sessionId);

            if (dataSession.length === 0) {
                alert("Tidak ada data di session ini");
                return;
            }

            showMonitoringChart(dataSession);
        };

        tbody.appendChild(tr);
    });
}

let m_chart;
function showMonitoringChart(data) {
    const ctx = document.getElementById("Chart_monitoring");

    const labels = data.map((_, i) => i + 1);
    const suhu = data.map(d => d.temperature || 0);
    const nitrogen = data.map(d => d.nitrogen || 0);
    const phosphorus = data.map(d => d.phosphorus || 0);
    const potassium = data.map(d => d.potassium || 0);
    const EC = data.map(d => d.ec || 0);
    const kelembaban = data.map(d => d.humidity || 0);
    const pH = data.map(d => d.ph || 0);

    if (m_chart) {
        m_chart.destroy();
    }

    m_chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Suhu",
                    data: suhu
                },
                {
                    label: "Nitrogen",
                    data: nitrogen
                },
                {
                    label: "Phosphorus",
                    data: phosphorus
                },
                {
                    label: "Potassium",
                    data: potassium
                },
                {
                    label: "kelembaban",
                    data: kelembaban
                },
                {
                    label: "EC",
                    data: EC
                },
                {
                    label: "pH",
                    data: pH
                }
            ]
        }
    });
}

async function init() {
    try {
        const sessions = await getSessions();

        if (sessions.length === 0) {
            console.log("Tidak ada data");
            return;
        }

        showSessions(sessions);
    } catch (error) {
        console.error("Error:", error);
    }
}

init();

// bagian map si monitor
var monitor_map = L.map('monitor_map').setView([-6.973, 107.634], 13);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
}).addTo(monitor_map);


let monitor_marker;
let manualmonitormode = false;

// update marker
function updatemonitorMap(lat, lng) {
    if (isNaN(lat) || isNaN(lng)) return;

    if (monitor_marker) {
        monitor_marker.setLatLng([lat, lng]);
    } else {
        monitor_marker = L.marker([lat, lng]).addTo(monitor_map);
    }

    monitor_marker.bindPopup(`Lat: ${lat}<br>Lng: ${lng}`).openPopup();
    monitor_map.setView([lat, lng], 17);
    monitor_map.invalidateSize();
}

function selectLocation_monitor(row) {
    manualmonitormode = true;

    document.querySelectorAll("#data-monitor tr")
        .forEach(r => r.classList.remove("active"));

    row.classList.add("active");

    let coord = row.getAttribute("data-coord");
    if (!coord) return;

    let [lat, lng] = coord.split(',').map(v => Number(v.trim()));

    updatemonitorMap(lat, lng);
}

function backToAutoMonitor() {
    manualmonitormode = false;
}


db.collection("agrolytics_monitoring")
.orderBy("startTime", "desc")
    .onSnapshot((snapshot) => {

        // render tabel
        renderTable(snapshot.docs);

        // ambil data terakhir saat pertama load
        if (isFirstLoad) {
            let docs = snapshot.docs;

            if (docs.length > 0) {
                let lastData = snapshot.docs[0].data();

                let lat = lastData.location.latitude;
                let lng = lastData.location.longitude;

                updatemonitorMap(lat, lng);
            }

            isFirstLoad = false;
            return;
        }

        // realtime data baru
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                let data = change.doc.data();

                if (!data.location) return;

                let lat = lastData.location.latitude;
                let lng = lastData.location.longitude;

                if (!manualmonitormode) {
                    updatemonitorMap(lat, lng);
                }
            }
        });

    });

// bagian rekomendasi
db.collection("agrolytics").onSnapshot((snapshot) => {
    let html = "";
    snapshot.forEach((doc) => {
        const data = doc.data();
        html += `
    <tr>
      <td>${data.id_map}</td>
      <td>${data.nilai_n}</td>
      <td>${data.nilai_p}</td>
      <td>${data.nilai_k}</td>
      <td>${data.nilai_ph}</td>
      <td>${data.nilai_suhu}</td>
      <td>${data.nilai_kelembaban}</td>
      <td>${data.nilai_ec}</td>
      <td>${data.name}</td>
    </tr>
    `;
    });
    document.getElementById("data-table").innerHTML = html;
});

let menuBtn = document.getElementById("menu-btn");
let navbar = document.querySelector(".navbar");

menuBtn.onclick = function () {
    navbar.classList.toggle("active");
};


let r_chart;
function showRekomendasiChart(namaTanaman) {
    console.log("Dipilih: ", namaTanaman);

    const rows = document.querySelectorAll("#data-table tr");
    let data = {
        nilai_n: [], nilai_p: [], nilai_k: [], nilai_ph: [], nilai_suhu: [], nilai_kelembaban: [], nilai_ec: []
    };


    rows.forEach(row => {
        const cols = row.querySelectorAll("td");

        // ini kalau kolom kurang langsung skip
        if (cols.length < 9) return;
        const tanaman = cols[8].innerText.trim();

        console.log("Data Tanaman: ", tanaman);

        if (tanaman.toLowerCase() === (namaTanaman || "").toString().toLowerCase()) {
            data.nilai_n.push(parseFloat(cols[1].innerText) || 0);
            data.nilai_p.push(parseFloat(cols[2].innerText) || 0);
            data.nilai_k.push(parseFloat(cols[3].innerText) || 0);
            data.nilai_ph.push(parseFloat(cols[4].innerText) || 0);
            data.nilai_suhu.push(parseFloat(cols[5].innerText) || 0);
            data.nilai_kelembaban.push(parseFloat(cols[6].innerText) || 0);
            data.nilai_ec.push(parseFloat(cols[7].innerText) || 0);
        }
    });

    console.log("Data Hasil: ", data);
    renderChart(data);
}

// ini utnuk buat grafik garisnya 

function renderChart(data) {
    const ctx = document.getElementById('Chart_rekomendasi');

    if (r_chart) {
        r_chart.destroy();
    }

    r_chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.nilai_n.map((_, i) => i + 1),
            datasets: [
                {
                    label: 'N',
                    data: data.nilai_n,
                    borderColor: 'red'
                },
                {
                    label: 'P',
                    data: data.nilai_p,
                    borderColor: 'blue'
                },
                {
                    label: 'K',
                    data: data.nilai_k,
                    borderColor: 'green'
                },
                {
                    label: 'Suhu',
                    data: data.nilai_suhu,
                    borderColor: 'orange'
                },
                {
                    label: 'Kelembaban',
                    data: data.nilai_kelembaban,
                    borderColor: 'black'
                },
                {
                    label: 'EC',
                    data: data.nilai_ec,
                    borderColor: 'cyan'
                }
            ]
        }
    });
}

var map = L.map('map').setView([-6.973, 107.634], 13);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
}).addTo(map);

let marker;
let manualMode = false;

// update marker
function updateMap(lat, lng) {
    if (isNaN(lat) || isNaN(lng)) return;

    if (marker) {
        marker.setLatLng([lat, lng]);
    } else {
        marker = L.marker([lat, lng]).addTo(map);
    }

    marker.bindPopup(`Lat: ${lat}<br>Lng: ${lng}`).openPopup();
    map.setView([lat, lng], 17);
    map.invalidateSize();
}

function renderTable(docs) {
    let tbody = document.getElementById("data-table");
    tbody.innerHTML = "";

    docs.forEach(doc => {
        let data = doc.data();

        let row = document.createElement("tr");

        row.setAttribute("data-coord", data.id_map);

        row.onclick = function () {
            selectLocation(this);
        };

        row.innerHTML = `
            <td>${data.id_map || "-"}</td>
            <td>${data.nilai_n || "-"}</td>
            <td>${data.nilai_p || "-"}</td>
            <td>${data.nilai_k || "-"}</td>
            <td>${data.nilai_ph || "-"}</td>
            <td>${data.nilai_suhu || "-"}</td>
            <td>${data.nilai_kelembaban || "-"}</td>
            <td>${data.nilai_ec || "-"}</td>
            <td>${data.name || "-"}</td>
        `;

        tbody.appendChild(row);
    });
}

// ================= CLICK TABLE =================
function selectLocation(row) {
    manualMode = true;

    document.querySelectorAll("#data-table tr")
        .forEach(r => r.classList.remove("active"));

    row.classList.add("active");

    let coord = row.getAttribute("data-coord");
    if (!coord) return;

    let [lat, lng] = coord.split(',').map(v => Number(v.trim()));

    updateMap(lat, lng);
}

// ================= AUTO MODE =================
function backToAuto() {
    manualMode = false;
}

// ================= FIRESTORE =================
let isFirstLoad = true;

db.collection("agrolytics")
    .onSnapshot((snapshot) => {

        // render tabel
        renderTable(snapshot.docs);

        // ambil data terakhir saat pertama load
        if (isFirstLoad) {
            let docs = snapshot.docs;

            if (docs.length > 0) {
                let lastData = docs[docs.length - 1].data();

                let [lat, lng] = lastData.id_map
                    .split(',')
                    .map(v => Number(v.trim()));

                updateMap(lat, lng);
            }

            isFirstLoad = false;
            return;
        }

        // realtime data baru
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                let data = change.doc.data();

                if (!data.id_map) return;

                let [lat, lng] = data.id_map
                    .split(',')
                    .map(v => Number(v.trim()));

                if (!manualMode) {
                    updateMap(lat, lng);
                }
            }
        });

    });

