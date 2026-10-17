package com.altura.api.realtime;

public record RealtimeEvent(
        String type,
        long connectionId,
        Object message
) {
    public static RealtimeEvent messageCreated(long connectionId, com.altura.api.dto.MessageResponse message) {
        return new RealtimeEvent("message.created", connectionId, message);
    }

    public static RealtimeEvent connectionDeleted(long connectionId) {
        return new RealtimeEvent("connection.deleted", connectionId, null);
    }

    public static RealtimeEvent connectionChanged(long connectionId) {
        return new RealtimeEvent("connection.changed", connectionId, null);
    }

    public static RealtimeEvent proposalChanged(long connectionId, Object proposal) {
        return new RealtimeEvent("proposal.changed", connectionId, proposal);
    }

    public static RealtimeEvent notificationChanged() {
        return new RealtimeEvent("notification.changed", 0, null);
    }

    public static RealtimeEvent roundChanged(long roundId) {
        return new RealtimeEvent("round.changed", roundId, null);
    }
}
