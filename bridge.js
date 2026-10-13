(() => {
  'use strict';

  const CHANNEL = 'prompt-spur-bridge-v1';
  window.__promptSpurBridge = { version: 1 };
  const originalFetch = window.fetch.bind(window);
  const profile = {
    nonce: null,
    busy: false,
    calibrated: false,
    directReady: false,
    conversationId: null,
    parentMessageId: null,
    model: null,
    thinkingEffort: null,
    timezone: null,
    timezoneOffset: null,
    prepareTemplate: null,
    conversationTemplate: null,
    headers: null,
    pendingNativeResponse: null,
    responseParentCaptured: false
  };

  const clone = value => JSON.parse(JSON.stringify(value));
  const relevantPath = path => /\/backend-api\/(?:f\/conversation(?:\/prepare)?|sentinel\/chat-requirements\/(?:prepare|finalize)|conversation\/init)(?:[/?]|$)/.test(path);
  const commandPath = path => /\/backend-api\/f\/conversation(?:\/prepare)?$/.test(path);

  function emit(type, payload = {}) {
    if (!profile.nonce) return;
    window.postMessage({ channel: CHANNEL, nonce: profile.nonce, type, payload }, location.origin);
  }

  function safeHeaders(headers) {
    const next = new Headers();
    for (const [name, value] of headers.entries()) {
      if (/^(authorization|chatgpt-account-id|oai-did|oai-language|x-oai-|content-type)$/i.test(name)) next.set(name, value);
    }
    next.set('content-type', 'application/json');
    return next;
  }

  function omitDynamicBody(body) {
    const next = clone(body);
    delete next.messages;
    delete next.partial_query;
    delete next.parent_message_id;
    delete next.conversation_id;
    return next;
  }

  function recordOutgoing(path, body, headers) {
    if (!body || typeof body !== 'object') return;
    if (path.endsWith('/prepare')) {
      profile.prepareTemplate = omitDynamicBody(body);
    } else if (path.endsWith('/f/conversation')) {
      profile.conversationTemplate = omitDynamicBody(body);
    }
    if (commandPath(path)) {
      profile.headers = safeHeaders(headers);
      profile.conversationId = body.conversation_id || profile.conversationId;
      profile.parentMessageId = body.parent_message_id || profile.parentMessageId;
      profile.model = body.model || profile.model;
      profile.thinkingEffort = body.thinking_effort || profile.thinkingEffort;
      profile.timezone = body.timezone || profile.timezone;
      profile.timezoneOffset = body.timezone_offset_min ?? profile.timezoneOffset;
    }
  }

  function findAssistantMessageId(value, seen = new WeakSet(), depth = 0) {
    if (!value || typeof value !== 'object' || depth > 10 || seen.has(value)) return null;
    seen.add(value);
    const authorRole = value.author?.role || value.role;
    if (authorRole === 'assistant' && typeof value.id === 'string') return value.id;
    for (const child of Object.values(value)) {
      const found = findAssistantMessageId(child, seen, depth + 1);
      if (found) return found;
    }
    return null;
  }

  async function consumeResponse(response, source) {
    const reader = response.clone().body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    let pending = '';
    if (source === 'native') profile.responseParentCaptured = false;
    try {
      for (;;) {
        const next = await reader.read();
        if (next.done) break;
        pending += decoder.decode(next.value, { stream: true });
        const lines = pending.split('\n');
        pending = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            const assistantId = findAssistantMessageId(event);
            if (assistantId) {
              profile.parentMessageId = assistantId;
              if (source === 'native') profile.responseParentCaptured = true;
            }
            profile.conversationId ||= event.conversation_id || event.conversation?.id || null;
          } catch { /* Non-JSON SSE events are irrelevant to the command state. */ }
        }
      }
      if (source === 'native' && profile.parentMessageId) {
        profile.calibrated = Boolean(profile.prepareTemplate && profile.conversationTemplate && profile.headers && profile.responseParentCaptured);
        // Direct rendering is deliberately gated until the live-response path is verified.
        profile.directReady = false;
        emit('STATUS', { calibrated: profile.calibrated, directReady: profile.directReady });
      }
    } finally {
      try { await reader.cancel(); } catch { /* stream has already ended */ }
    }
  }

  window.fetch = function promptSpurFetch(...args) {
    let request;
    try { request = new Request(args[0], args[1]); }
    catch { return originalFetch(...args); }
    const path = new URL(request.url).pathname;
    const response = originalFetch(...args);
    if (!relevantPath(path)) return response;

    if (commandPath(path)) {
      request.clone().json()
        .then(body => recordOutgoing(path, body, request.headers))
        .catch(() => {});
    }
    if (path.endsWith('/f/conversation')) response.then(reply => consumeResponse(reply, 'native')).catch(() => {});
    return response;
  };

  function makeMessage(text) {
    return {
      id: crypto.randomUUID(),
      author: { role: 'user', metadata: {}, name: null },
      channel: null,
      content: { content_type: 'text', parts: [text] },
      create_time: Date.now() / 1000,
      end_turn: null,
      metadata: {},
      recipient: 'all',
      status: 'in_progress',
      update_time: null,
      weight: 1
    };
  }

  async function directSend(text) {
    if (!profile.directReady) throw new Error('Direct mode is not calibrated');
    if (profile.busy) throw new Error('A request is already active');
    profile.busy = true;
    try {
      const prepare = {
        ...clone(profile.prepareTemplate),
        action: 'next',
        conversation_id: profile.conversationId,
        parent_message_id: profile.parentMessageId,
        model: profile.model,
        thinking_effort: profile.thinkingEffort,
        timezone: profile.timezone,
        timezone_offset_min: profile.timezoneOffset,
        partial_query: { id: crypto.randomUUID(), author: { role: 'user' }, content: { content_type: 'text', parts: [text] } }
      };
      const prepareResponse = await originalFetch('/backend-api/f/conversation/prepare', {
        method: 'POST', credentials: 'include', headers: profile.headers, body: JSON.stringify(prepare)
      });
      if (!prepareResponse.ok) throw new Error(`Prepare failed: ${prepareResponse.status}`);

      const conversation = {
        ...clone(profile.conversationTemplate),
        action: 'next',
        conversation_id: profile.conversationId,
        parent_message_id: profile.parentMessageId,
        model: profile.model,
        thinking_effort: profile.thinkingEffort,
        timezone: profile.timezone,
        timezone_offset_min: profile.timezoneOffset,
        messages: [makeMessage(text)]
      };
      const response = await originalFetch('/backend-api/f/conversation', {
        method: 'POST', credentials: 'include', headers: profile.headers, body: JSON.stringify(conversation)
      });
      if (!response.ok) throw new Error(`Conversation failed: ${response.status}`);
      await consumeResponse(response, 'direct');
      return { mode: 'direct' };
    } finally {
      profile.busy = false;
    }
  }

  window.addEventListener('message', event => {
    if (event.source !== window || event.origin !== location.origin) return;
    const data = event.data;
    if (!data || data.channel !== CHANNEL) return;
    if (data.type === 'HELLO') {
      profile.nonce = data.nonce;
      emit('STATUS', { calibrated: profile.calibrated, directReady: profile.directReady });
      return;
    }
    if (data.nonce !== profile.nonce || data.type !== 'SEND') return;
    const requestId = data.payload?.requestId;
    directSend(data.payload?.text || 'turn')
      .then(payload => emit('SEND_RESULT', { requestId, ok: true, ...payload }))
      .catch(error => emit('SEND_RESULT', { requestId, ok: false, fallback: true, reason: String(error.message || error) }));
  });
})();
