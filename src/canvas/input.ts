export interface InputState {
  mouseX: number;
  mouseY: number;
  isMouseDown: boolean;
  rightClick: boolean;
  lastClickX: number;
  lastClickY: number;
  clickFired: boolean;
  rightClickFired: boolean;
  longPressTimer: number | null;
}

export function getCanvasDpr(): number {
  return Math.min(window.devicePixelRatio || 1, 2);
}

export function createInputState(): InputState {
  return {
    mouseX: -1,
    mouseY: -1,
    isMouseDown: false,
    rightClick: false,
    lastClickX: -1,
    lastClickY: -1,
    clickFired: false,
    rightClickFired: false,
    longPressTimer: null,
  };
}

export function attachInputHandlers(
  canvas: HTMLCanvasElement,
  state: InputState,
  onPlace: (x: number, y: number) => void,
  onRemove: () => void
) {
  const getPos = (e: MouseEvent | Touch) => {
    const rect = canvas.getBoundingClientRect();
    const dpr = getCanvasDpr();
    return {
      x: (e.clientX - rect.left) * dpr,
      y: (e.clientY - rect.top) * dpr,
    };
  };

  const handleMove = (e: MouseEvent) => {
    const pos = getPos(e);
    state.mouseX = pos.x;
    state.mouseY = pos.y;
  };

  const handleDown = (e: MouseEvent) => {
    if (e.button === 2) {
      state.rightClick = true;
      state.rightClickFired = true;
      onRemove();
      return;
    }
    state.isMouseDown = true;
    const pos = getPos(e);
    state.lastClickX = pos.x;
    state.lastClickY = pos.y;
    state.clickFired = true;
    onPlace(pos.x, pos.y);
  };

  const handleUp = () => {
    state.isMouseDown = false;
    state.rightClick = false;
  };

  const handleContext = (e: Event) => e.preventDefault();

  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      const pos = getPos(e.touches[0]);
      state.mouseX = pos.x;
      state.mouseY = pos.y;
      state.lastClickX = pos.x;
      state.lastClickY = pos.y;
      state.isMouseDown = true;

      state.longPressTimer = window.setTimeout(() => {
        state.rightClickFired = true;
        onRemove();
      }, 500);

      state.clickFired = true;
      onPlace(pos.x, pos.y);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      const pos = getPos(e.touches[0]);
      state.mouseX = pos.x;
      state.mouseY = pos.y;
      if (state.longPressTimer !== null) {
        clearTimeout(state.longPressTimer);
        state.longPressTimer = null;
      }
    }
  };

  const handleTouchEnd = () => {
    state.isMouseDown = false;
    if (state.longPressTimer !== null) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }
  };

  const handleLeave = () => {
    state.mouseX = -1;
    state.mouseY = -1;
    state.isMouseDown = false;
  };

  canvas.addEventListener("mousemove", handleMove);
  canvas.addEventListener("mousedown", handleDown);
  canvas.addEventListener("mouseup", handleUp);
  canvas.addEventListener("mouseleave", handleLeave);
  canvas.addEventListener("contextmenu", handleContext);
  canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
  canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
  canvas.addEventListener("touchend", handleTouchEnd);

  return () => {
    canvas.removeEventListener("mousemove", handleMove);
    canvas.removeEventListener("mousedown", handleDown);
    canvas.removeEventListener("mouseup", handleUp);
    canvas.removeEventListener("mouseleave", handleLeave);
    canvas.removeEventListener("contextmenu", handleContext);
    canvas.removeEventListener("touchstart", handleTouchStart);
    canvas.removeEventListener("touchmove", handleTouchMove);
    canvas.removeEventListener("touchend", handleTouchEnd);
  };
}
