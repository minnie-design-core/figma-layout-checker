// UI 스크립트
// HTML은 webpack 설정에서 처리됩니다
import './styles.css';

// DOM 요소 가져오기
const convertButton = document.getElementById('convert-button') as HTMLButtonElement;
const cancelButton = document.getElementById('cancel-button') as HTMLButtonElement;
const spacingInput = document.getElementById('spacing') as HTMLInputElement;
const paddingTopInput = document.getElementById('padding-top') as HTMLInputElement;
const paddingRightInput = document.getElementById('padding-right') as HTMLInputElement;
const paddingBottomInput = document.getElementById('padding-bottom') as HTMLInputElement;
const paddingLeftInput = document.getElementById('padding-left') as HTMLInputElement;
const autoDetectPadding = document.getElementById('auto-detect-padding') as HTMLInputElement;
const autoDetectSpacing = document.getElementById('auto-detect-spacing') as HTMLInputElement;
const resultContainer = document.getElementById('result-container') as HTMLDivElement;
const resultMessage = document.getElementById('result-message') as HTMLDivElement;
const messagesList = document.getElementById('messages-list') as HTMLDivElement;

// 자동 감지 체크박스 이벤트 리스너
autoDetectPadding.addEventListener('change', () => {
  // 패딩 자동 감지 체크박스 변경 처리
  const disabled = autoDetectPadding.checked;
  paddingTopInput.disabled = disabled;
  paddingRightInput.disabled = disabled;
  paddingBottomInput.disabled = disabled;
  paddingLeftInput.disabled = disabled;
});

autoDetectSpacing.addEventListener('change', () => {
  // 간격 자동 감지 체크박스 변경 처리
  spacingInput.disabled = autoDetectSpacing.checked;
});

// 초기 상태 설정
paddingTopInput.disabled = autoDetectPadding.checked;
paddingRightInput.disabled = autoDetectPadding.checked;
paddingBottomInput.disabled = autoDetectPadding.checked;
paddingLeftInput.disabled = autoDetectPadding.checked;
spacingInput.disabled = autoDetectSpacing.checked;

// 변환 버튼 클릭 이벤트 리스너
convertButton.addEventListener('click', () => {
  // 옵션 객체 생성
  const options: any = {};
  
  // 자동 감지가 아닌 경우에만 값 설정
  if (!autoDetectSpacing.checked) {
    options.itemSpacing = parseInt(spacingInput.value) || 0;
  }
  
  if (!autoDetectPadding.checked) {
    options.padding = {
      top: parseInt(paddingTopInput.value) || 0,
      right: parseInt(paddingRightInput.value) || 0,
      bottom: parseInt(paddingBottomInput.value) || 0,
      left: parseInt(paddingLeftInput.value) || 0
    };
  }
  
  // 부모 코드로 메시지 전송
  parent.postMessage({ 
    pluginMessage: { 
      type: 'convert-to-autolayout',
      options
    } 
  }, '*');
});

// 취소 버튼 클릭 이벤트 리스너
cancelButton.addEventListener('click', () => {
  // 취소 메시지 전송
  parent.postMessage({ 
    pluginMessage: { 
      type: 'cancel'
    } 
  }, '*');
});

// 결과 표시 함수
function showResults(result: any) {
  resultContainer.style.display = 'block';
  
  // 성공 또는 실패에 따른 메시지 스타일 설정
  if (result.success > 0) {
    resultMessage.className = 'message success';
    resultMessage.textContent = `${result.success}개의 프레임이 오토레이아웃으로 변환되었습니다.`;
    if (result.failed > 0) {
      resultMessage.textContent += ` (${result.failed}개 실패)`;
    }
  } else if (result.failed > 0) {
    resultMessage.className = 'message error';
    resultMessage.textContent = `변환에 실패했습니다. (${result.failed}개 실패)`;
  }
  
  // 세부 메시지 표시
  if (result.messages && result.messages.length > 0) {
    messagesList.innerHTML = '';
    result.messages.forEach((message: string) => {
      const messageItem = document.createElement('div');
      messageItem.className = 'message-item';
      messageItem.textContent = message;
      messagesList.appendChild(messageItem);
    });
    messagesList.style.display = 'block';
  } else {
    messagesList.style.display = 'none';
  }
}

// 부모 코드로부터 메시지 수신
window.onmessage = (event) => {
  const message = event.data.pluginMessage;
  if (!message) return;
  
  if (message.type === 'conversion-result') {
    // 변환 결과 표시
    showResults(message.result);
  }
}; 