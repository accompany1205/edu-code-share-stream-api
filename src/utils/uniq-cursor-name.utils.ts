const cursorNames: string[] = [];

let postfixCounter = 0;

const getUniqPostFix = (): string => {
  return `_${++postfixCounter}`;
};

export const getUniqCursorName = (name: string): string => {
  const isExist = cursorNames.includes(name);

  if (isExist) {
    return getUniqCursorName(name + getUniqPostFix());
  }

  cursorNames.push(name);

  return name;
};
