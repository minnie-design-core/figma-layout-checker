// Figma 플러그인 메인 코드
figma.showUI(__html__, { width: 320, height: 480 });

// 메시지 처리
figma.ui.onmessage = async (msg) => {
  // 플러그인 명령에 따른 동작 처리
  if (msg.type === 'convert-to-autolayout') {
    await convertToAutoLayout(msg.options);
  } else if (msg.type === 'cancel') {
    figma.closePlugin();
  }
};

// 선택된 프레임을 오토레이아웃으로 변환하는 함수
async function convertToAutoLayout(options: any = {}) {
  // 현재 선택된 요소 가져오기
  const selection = figma.currentPage.selection;

  // 선택된 요소가 없는 경우
  if (selection.length === 0) {
    figma.notify('변환할 프레임을 선택해주세요.');
    return;
  }

  // 응답 객체 초기화
  const result = {
    success: 0,
    failed: 0,
    messages: [] as string[]
  };

  // 각 선택된 요소에 대해 처리
  for (const node of selection) {
    try {
      if (isValidFrame(node)) {
        await processFrame(node as FrameNode, options);
        result.success++;
      } else {
        result.failed++;
        result.messages.push(`"${node.name}" - 지원되지 않는 레이어 타입 (프레임, 그룹, 컴포넌트만 지원합니다)`);
      }
    } catch (error) {
      result.failed++;
      result.messages.push(`"${node.name}" - 처리 중 오류 발생: ${error}`);
    }
  }

  // 결과 알림
  if (result.success > 0) {
    const message = `${result.success}개의 프레임이 오토레이아웃으로 변환되었습니다.`;
    figma.notify(message + (result.failed > 0 ? ` (${result.failed}개 실패)` : ''));
  } else if (result.failed > 0) {
    figma.notify(`변환에 실패했습니다. (${result.failed}개 실패)`);
  }

  // 결과 UI로 전송
  figma.ui.postMessage({
    type: 'conversion-result',
    result: result
  });
}

// 유효한 프레임인지 확인하는 함수
function isValidFrame(node: SceneNode): boolean {
  return node.type === 'FRAME' || 
         node.type === 'GROUP' || 
         node.type === 'COMPONENT' || 
         node.type === 'INSTANCE';
}

// 프레임 처리 함수
async function processFrame(frame: FrameNode, options: any = {}) {
  // 자식 노드가 없으면 처리 중단
  if (frame.children.length === 0) {
    return;
  }

  // 프레임 내 레이어 정보 분석
  const analysis = analyzeLayout(frame);

  // 오토 레이아웃 속성 적용
  applyAutoLayout(frame, analysis, options);
}

// 레이아웃 분석 함수
function analyzeLayout(frame: FrameNode) {
  // 자식 요소들의 위치와 크기 정보 수집
  const children = frame.children;
  
  // 수직 또는 수평 방향 판단을 위한 분석
  let isVertical = true;
  let lastBottom = -Infinity;
  let lastRight = -Infinity;
  
  // 모든 요소가 수직으로 쌓여있는지 확인
  for (const child of children) {
    if (child.y < lastBottom) {
      isVertical = false;
      break;
    }
    lastBottom = child.y + child.height;
  }
  
  // 수평 방향 확인
  let isHorizontal = true;
  if (!isVertical) {
    for (const child of children) {
      if (child.x < lastRight) {
        isHorizontal = false;
        break;
      }
      lastRight = child.x + child.width;
    }
  }
  
  // 방향 결정
  const layoutDirection = isVertical ? 'VERTICAL' : (isHorizontal ? 'HORIZONTAL' : 'MIXED');
  
  // 간격 계산
  let spacing = 0;
  if (children.length > 1) {
    if (layoutDirection === 'VERTICAL') {
      // 수직 간격 계산
      const spacings = [];
      for (let i = 1; i < children.length; i++) {
        spacings.push(children[i].y - (children[i-1].y + children[i-1].height));
      }
      // 가장 일반적인 간격 찾기
      spacing = findMostCommonValue(spacings);
    } else if (layoutDirection === 'HORIZONTAL') {
      // 수평 간격 계산
      const spacings = [];
      for (let i = 1; i < children.length; i++) {
        spacings.push(children[i].x - (children[i-1].x + children[i-1].width));
      }
      // 가장 일반적인 간격 찾기
      spacing = findMostCommonValue(spacings);
    }
  }
  
  // 패딩 계산
  const paddings = calculatePadding(frame);
  
  return {
    direction: layoutDirection,
    spacing: spacing > 0 ? spacing : 0,
    paddings: paddings
  };
}

// 가장 일반적인 값 찾기 (간격 계산용)
function findMostCommonValue(values: number[]): number {
  if (values.length === 0) return 0;
  
  // 값들을 반올림하여 근사치로 그룹화
  const roundedValues = values.map(v => Math.round(v));
  
  // 각 값의 출현 빈도 계산
  const frequency: {[key: number]: number} = {};
  for (const value of roundedValues) {
    frequency[value] = (frequency[value] || 0) + 1;
  }
  
  // 가장 빈번한 값 찾기
  let mostCommonValue = 0;
  let highestFrequency = 0;
  
  for (const value in frequency) {
    if (frequency[value] > highestFrequency) {
      highestFrequency = frequency[value];
      mostCommonValue = parseInt(value);
    }
  }
  
  return mostCommonValue;
}

// 패딩 계산 함수
function calculatePadding(frame: FrameNode) {
  const children = frame.children;
  if (children.length === 0) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  
  // 초기값 설정
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  // 자식 요소들의 영역 계산
  for (const child of children) {
    minX = Math.min(minX, child.x);
    minY = Math.min(minY, child.y);
    maxX = Math.max(maxX, child.x + child.width);
    maxY = Math.max(maxY, child.y + child.height);
  }
  
  // 패딩 계산
  return {
    top: Math.round(minY),
    right: Math.round(frame.width - maxX),
    bottom: Math.round(frame.height - maxY),
    left: Math.round(minX)
  };
}

// 오토레이아웃 적용 함수
function applyAutoLayout(frame: FrameNode, analysis: any, options: any = {}) {
  // 프레임의 자식들 임시 저장
  const children = [...frame.children];
  
  // 오토 레이아웃 방향이 혼합된 경우
  if (analysis.direction === 'MIXED') {
    figma.notify(`"${frame.name}" - 일관된 레이아웃 패턴을 찾을 수 없습니다. 수동으로 조정해주세요.`);
    return;
  }
  
  // 오토 레이아웃 적용
  frame.layoutMode = analysis.direction;
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';
  frame.itemSpacing = analysis.spacing;
  
  // 패딩 적용
  frame.paddingTop = Math.max(0, analysis.paddings.top);
  frame.paddingRight = Math.max(0, analysis.paddings.right);
  frame.paddingBottom = Math.max(0, analysis.paddings.bottom);
  frame.paddingLeft = Math.max(0, analysis.paddings.left);
  
  // 사용자 옵션 추가 적용 (있는 경우)
  if (options.itemSpacing !== undefined) {
    frame.itemSpacing = options.itemSpacing;
  }
  
  if (options.padding !== undefined) {
    const padding = options.padding;
    frame.paddingTop = padding.top !== undefined ? padding.top : frame.paddingTop;
    frame.paddingRight = padding.right !== undefined ? padding.right : frame.paddingRight;
    frame.paddingBottom = padding.bottom !== undefined ? padding.bottom : frame.paddingBottom;
    frame.paddingLeft = padding.left !== undefined ? padding.left : frame.paddingLeft;
  }
  
  // 자식 노드의 정렬 설정
  for (const child of children) {
    if ('layoutAlign' in child) {
      // 기본 스트레치 정렬
      child.layoutAlign = 'STRETCH';
    }
  }
}