package com.altura.api.realtime;

import com.altura.api.dto.MessageResponse;

public record RealtimeEvent(
        String type,
        long connectionId,
        MessageResponse message
) {
    public static RealtimeEvent messageCreated(long connectionId, MessageResponse message) {
        return new RealtimeEvent("message.created", connectionId, message);
    }

    public static RealtimeEvent connectionDeleted(long connectionId) {
        return new RealtimeEvent("connection.deleted", connectionId, null);
    }
}
