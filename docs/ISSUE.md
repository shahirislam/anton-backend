  Hi Team,

  We're facing a critical issue with our WebRTC live streaming feature. When multiple viewers join a stream, only the most recently connected viewer can watch properly. The streams for all previously
  connected viewers freeze as soon as a new viewer establishes their connection.

  Problem Analysis:

  The frontend has been thoroughly investigated and updated. The client-side code now correctly manages a separate RTCPeerConnection for each individual viewer and includes a queueing mechanism to
  handle potential race conditions with ICE candidates. Despite these improvements, the issue remains, which strongly indicates a problem on the signaling server.

  Suspected Cause:

  The root cause is likely that WebRTC signaling messages are being broadcast to all users in a room instead of being unicast (targeted) to the specific intended recipient.

  For example, when a new viewer (Viewer B) connects, their client sends ICE candidates back to the server to establish a connection with the admin. If the server broadcasts these ICE candidates to
  everyone in the room, then existing viewers (e.g., Viewer A) will receive candidates that are not part of their session. This corrupts their peer connection state and causes their video to freeze.

  Action Required:

  Could you please urgently review the backend signaling logic for all WebRTC-related socket events (e.g., stream:offer, stream:answer, stream:ice-candidate)?

  Specifically, please verify the following:
   1. Targeted Emission: When the server receives a message from the admin client with a targetViewer ID, it must send the message only to that specific viewer's socket ID
      (io.to(targetViewerSocketId).emit(...)). It should not be broadcast to the room.
   2. Targeted Forwarding: When the server receives a message from a viewer client (like an answer or ice-candidate), it must forward it only to the admin client. It should not be broadcast to other
      viewers in the room.

  The only messages that should be broadcast to the entire room are general notifications like viewer-join or viewer-leave. All messages related to the WebRTC session establishment itself (offer,
  answer, ice-candidate) must be strictly routed point-to-point between the admin and the specific viewer involved.

  Thank you for looking into this.