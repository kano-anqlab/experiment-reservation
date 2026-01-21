// Google Apps Script のデプロイURL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxzLRQxkAZA0klzsfP9uYaZKtgXa553blWvu77gURC4ndqXihqEzNc-4NFvMEzoY4yv/exec';

// フォーム要素の取得
const form = document.getElementById('reservationForm');
const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const dateSelect = document.getElementById('date');
const timeSelect = document.getElementById('time');

// 空き枠データ
let availableSlots = {};

// ページ読み込み時に空き枠を取得
document.addEventListener('DOMContentLoaded', async () => {
    await loadAvailableSlots();
});

// 空き枠を取得
async function loadAvailableSlots() {
    try {
        // 本番モード：Google Apps Script から取得
        const response = await fetch(`${SCRIPT_URL}?action=getAvailableSlots`);
        const data = await response.json();
        if (data.success) {
            availableSlots = data.slots;
        }

        populateDateOptions();

    } catch (error) {
        console.error('空き枠の取得に失敗しました:', error);
        dateSelect.innerHTML = '<option value="">空き枠の取得に失敗しました</option>';
    }
}

// デモ用：ダミーの空き枠データを生成
function generateDummySlots() {
    const slots = {};
    const today = new Date();
    const times = ['10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];

    for (let i = 1; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);

        // 土日をスキップ
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            continue;
        }

        const dateStr = date.toISOString().split('T')[0];
        // ランダムに空き枠を設定（デモ用）
        slots[dateStr] = times.filter(() => Math.random() > 0.3);

        // 空き枠がない日は削除
        if (slots[dateStr].length === 0) {
            delete slots[dateStr];
        }
    }

    return slots;
}

// 日付の選択肢を設定
function populateDateOptions() {
    dateSelect.innerHTML = '<option value="">日付を選択してください</option>';

    const dates = Object.keys(availableSlots).sort();

    if (dates.length === 0) {
        dateSelect.innerHTML = '<option value="">現在予約可能な日程がありません</option>';
        return;
    }

    dates.forEach(dateStr => {
        const date = new Date(dateStr);
        const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
        const formattedDate = `${dateStr} (${dayOfWeek})`;

        const option = document.createElement('option');
        option.value = dateStr;
        option.textContent = formattedDate;
        dateSelect.appendChild(option);
    });
}

// 日付選択時に時間の選択肢を更新
dateSelect.addEventListener('change', () => {
    const selectedDate = dateSelect.value;

    if (!selectedDate) {
        timeSelect.innerHTML = '<option value="">まず日付を選択してください</option>';
        timeSelect.disabled = true;
        return;
    }

    const times = availableSlots[selectedDate] || [];

    timeSelect.innerHTML = '<option value="">時間を選択してください</option>';

    times.forEach(time => {
        const option = document.createElement('option');
        option.value = time;
        option.textContent = time;
        timeSelect.appendChild(option);
    });

    timeSelect.disabled = false;
});

// 今日の日付を取得して、過去の日付を選択できないようにする（不要になったが念のため残す）
// const dateInput = document.getElementById('date');
// const today = new Date().toISOString().split('T')[0];
// dateInput.min = today;

// 学年の「その他」表示切り替え
function toggleGradeOther() {
    const gradeSelect = document.getElementById('grade');
    const gradeOtherInput = document.getElementById('grade_other');

    if (gradeSelect.value === 'その他') {
        gradeOtherInput.style.display = 'block';
        gradeOtherInput.required = true;
    } else {
        gradeOtherInput.style.display = 'none';
        gradeOtherInput.required = false;
        gradeOtherInput.value = '';
    }
}

// フォーム送信イベント
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 手動でバリデーションチェック
    if (!form.checkValidity()) {
        e.stopPropagation();
        alert('入力に不備があります。必須項目（*マーク）を入力・選択してください。');
        form.reportValidity(); // ネイティブのバリデーションメッセージも表示
        return;
    }

    const submitBtn = form.querySelector('.submit-btn');
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    submitBtn.textContent = '送信中...';

    // 学年の値を取得
    const gradeSelect = document.getElementById('grade');
    const gradeOtherInput = document.getElementById('grade_other');
    let gradeValue = gradeSelect.value;
    if (gradeValue === 'その他') {
        gradeValue = gradeOtherInput.value;
    }

    // フォームデータの取得
    const formData = {
        name: document.getElementById('name').value,
        kana: document.getElementById('kana').value,
        affiliation: document.getElementById('affiliation').value,
        grade: gradeValue, // 修正されたgradeValueを使用
        gender: document.getElementById('gender').value,
        age: document.getElementById('age').value,
        handedness: document.getElementById('handedness').value,
        email: document.getElementById('email').value,
        date: document.getElementById('date').value,
        time: document.getElementById('time').value,
        notes: document.getElementById('notes').value,
        timestamp: new Date().toISOString()
    };

    try {
        // Google Apps Script にデータを送信
        await submitReservation(formData);

        // 成功メッセージを表示
        form.classList.add('hidden');
        successMessage.classList.remove('hidden');

        // 空き枠を再取得（予約済みの枠を除外するため）
        await loadAvailableSlots();

    } catch (error) {
        console.error('Error:', error);
        errorText.textContent = error.message || '予約の送信に失敗しました。もう一度お試しください。';
        form.classList.add('hidden');
        errorMessage.classList.remove('hidden');
    } finally {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
        submitBtn.textContent = '予約を確定する';
    }
});

// 予約データの送信（実装例）
async function submitReservation(data) {
    // 本番モード：Google Apps Script にPOSTリクエストを送信
    const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    });

    // no-corsモードでは response.ok が使えないため、成功とみなす
    console.log('予約データ:', data);
    return { success: true };

    // デモ用の遅延
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('予約データ:', data);
    return { success: true };
}

// フォームをリセット
function resetForm() {
    form.reset();
    form.classList.remove('hidden');
    successMessage.classList.add('hidden');

    // 時間選択を無効化
    timeSelect.innerHTML = '<option value="">まず日付を選択してください</option>';
    timeSelect.disabled = true;
}

// エラーメッセージを非表示
function hideError() {
    form.classList.remove('hidden');
    errorMessage.classList.add('hidden');
}

// 予約データを確認（開発用）
function viewReservations() {
    const reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
    console.table(reservations);
    return reservations;
}

// コンソールにヘルプメッセージを表示
console.log('%c予約システム - 開発モード', 'color: #6366f1; font-size: 16px; font-weight: bold;');
console.log('予約データを確認: viewReservations()');
