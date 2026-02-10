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
let genderCounts = { male: 0, female: 0 };
let genderLimits = { male: 8, female: 8 };

// ページ読み込み時に空き枠を取得
document.addEventListener('DOMContentLoaded', async () => {
    await loadAvailableSlots();

    // 性別選択時のイベントリスナーを追加
    const genderSelect = document.getElementById('gender');
    if (genderSelect) {
        genderSelect.addEventListener('change', checkGenderLimit);
    }
});

// 空き枠を取得
async function loadAvailableSlots() {
    try {
        // 本番モード：Google Apps Script から取得
        const response = await fetch(`${SCRIPT_URL}?action=getAvailableSlots`);
        const data = await response.json();
        if (data.success) {
            availableSlots = data.slots;
            // 定員情報の取得
            if (data.counts) genderCounts = data.counts;
            if (data.limits) genderLimits = data.limits;

            // すでに性別が選択されている場合はチェックを実行
            checkGenderLimit();
        }

        populateDateOptions();

    } catch (error) {
        console.error('空き枠の取得に失敗しました:', error);
        dateSelect.innerHTML = '<option value="">空き枠の取得に失敗しました</option>';
    }
}

// 性別定員のチェック
function checkGenderLimit() {
    const genderSelect = document.getElementById('gender');
    const warningText = document.getElementById('genderWarning');
    const selectedGender = genderSelect.value;

    if (!warningText) return;

    // リセット
    warningText.style.display = 'none';
    warningText.textContent = '';

    if (!selectedGender) return;

    let isFull = false;
    let limit = 0;

    // 定員情報のログ確認（デバッグ用）
    console.log('Gender Check:', selectedGender, genderCounts, genderLimits);

    if (selectedGender === '男性') {
        limit = genderLimits.male || 8;
        if ((genderCounts.male || 0) >= limit) isFull = true;
    } else if (selectedGender === '女性') {
        limit = genderLimits.female || 8;
        if ((genderCounts.female || 0) >= limit) isFull = true;
    }

    if (isFull) {
        warningText.style.display = 'block';
        warningText.textContent = `※ ${selectedGender}の定員（${limit}名）に達しているため、キャンセル待ちでの受付となります。`;
    }
}

// デモ用：ダミーの空き枠データを生成
function generateDummySlots() {
    const slots = {};
    // 実験期間
    const startDate = new Date('2026-02-16');
    const endDate = new Date('2026-03-06');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 時間枠定義
    const timeSlotsAll = ['09:30', '11:00', '13:00', '14:30'];
    const timeSlotsYA = ['14:30'];

    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        // 過去の日付は（デモ上も）表示しない場合
        if (currentDate < today) {
            currentDate.setDate(currentDate.getDate() + 1);
            continue;
        }

        const dateStr = currentDate.toISOString().split('T')[0];
        const dayOfWeek = currentDate.getDay();

        // 土日はスキップ
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            currentDate.setDate(currentDate.getDate() + 1);
            continue;
        }

        // 日付に応じた時間枠
        let times;
        if (dateStr === '2026-02-16') {
            times = [...timeSlotsAll];
        } else if (dateStr === '2026-02-24') {
            // 2/24は午後の2枠
            times = ['13:00', '14:30'];
        } else {
            times = [...timeSlotsYA];
        }

        // デモ用：ランダムに少しだけ埋まっているように見せる（確率20%で枠削除）
        times = times.filter(() => Math.random() > 0.2);

        if (times.length > 0) {
            slots[dateStr] = times;
        }

        currentDate.setDate(currentDate.getDate() + 1);
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

        // 終了時間を計算して表示（所要時間60分）
        try {
            const [hours, minutes] = time.split(':').map(Number);
            const date = new Date();
            date.setHours(hours, minutes + 60);
            const endHours = date.getHours().toString().padStart(2, '0');
            const endMinutes = date.getMinutes().toString().padStart(2, '0');
            option.textContent = `${time}～${endHours}:${endMinutes}`;
        } catch (e) {
            console.error('Time format error:', e);
            option.textContent = time;
        }

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
