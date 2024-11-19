// utils/utils.js

// PERSONA_ORDER 정의
export const PERSONA_ORDER = ['Joy', 'Anger', 'Disgust', 'Sadness', 'Fear'];

// 페르소나 정렬 함수
export const sortPersonas = (persona1, persona2) => {
  const index1 = PERSONA_ORDER.indexOf(persona1);
  const index2 = PERSONA_ORDER.indexOf(persona2);

  if (index1 === -1 || index2 === -1) {
    throw new Error('Invalid persona name.');
  }

  if (index1 < index2) {
    return [persona1, persona2];
  } else {
    return [persona2, persona1];
  }
};

// 정렬된 페르소나를 기반으로 pairName 생성
export const createPersonaPairName = (persona1, persona2) => {
  const sortedPersonas = sortPersonas(persona1, persona2);
  return `${sortedPersonas[0]}_${sortedPersonas[1]}`;
};
