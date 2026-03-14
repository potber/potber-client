export function normalizeOverscrollTolerance(tolerance?: number) {
  if (
    typeof tolerance !== 'number' ||
    Number.isNaN(tolerance) ||
    tolerance < 0
  ) {
    return 5;
  }

  return tolerance;
}

export function shouldTriggerOverscroll({
  direction,
  scrollTop,
  clientHeight,
  scrollHeight,
  tolerance,
}: {
  direction: 'up' | 'down';
  scrollTop: number;
  clientHeight: number;
  scrollHeight: number;
  tolerance: number;
}) {
  if (direction === 'down') {
    return scrollTop <= tolerance;
  }

  return scrollTop + clientHeight >= scrollHeight - tolerance;
}

export function getSidebarSwipeType({
  isRightSidebar,
  action,
}: {
  isRightSidebar: boolean;
  action: 'open' | 'close';
}) {
  if (action === 'open') {
    return isRightSidebar ? 'swipeleft' : 'swiperight';
  }

  return isRightSidebar ? 'swiperight' : 'swipeleft';
}
