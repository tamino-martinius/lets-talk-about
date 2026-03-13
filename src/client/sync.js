/*
  BroadcastChannel sync module for lets-talk-about presenter mode.
  Keeps presenter and viewer windows in sync without server communication.
*/

let channel = null;
let onSyncCallback = null;
let suppressNextBroadcast = false;

function getChannelName() {
  const pathname = location.pathname.replace(/\/(presenter|viewer)?\/?(\?.*)?$/, '/');
  return 'lets-talk-about:' + location.origin + pathname;
}

export function initSync(callback) {
  onSyncCallback = callback;
  channel = new BroadcastChannel(getChannelName());

  channel.onmessage = (event) => {
    const { data } = event;

    if (data.type === 'sync' && onSyncCallback) {
      suppressNextBroadcast = true;
      onSyncCallback(data.slide, data.buildStep);
    }

    if (data.type === 'request-state' && onSyncCallback) {
      // Respond with current state — the callback owner should call broadcastState
      // We dispatch a custom event so the host module can respond
      window.dispatchEvent(new CustomEvent('sync-request-state'));
    }
  };
}

export function broadcastState(slide, buildStep) {
  if (suppressNextBroadcast) {
    suppressNextBroadcast = false;
    return;
  }
  if (!channel) return;
  channel.postMessage({ type: 'sync', slide, buildStep });
}

export function requestState() {
  if (!channel) return;
  channel.postMessage({ type: 'request-state' });
}

export function destroySync() {
  if (channel) {
    channel.close();
    channel = null;
  }
  onSyncCallback = null;
}
