import eventEmitter from "./eventEmitter";

// Follows a background job (store backup or duplication) by server push: the
// API sends "job_progress" { job_id, kind, progress } to the user who started
// the job whenever its progress changes, so the browser does not poll.
// onProgress gets the same shape the job's /progress endpoint answers
// ({ status: true, result: progress }); onReconnect runs after the WebSocket
// reconnects, to catch up with one read of that endpoint.
// Returns { stop() }.
export function watchJobProgress(jobId, onProgress, onReconnect) {
    const onEvent = (data) => {
        if (data?.job_id === jobId) onProgress({ status: true, result: data.progress });
    };
    const onOpen = () => { if (onReconnect) onReconnect(); };
    eventEmitter.on("job_progress", onEvent);
    eventEmitter.on("socket_connection_open", onOpen);
    return {
        stop() {
            eventEmitter.off("job_progress", onEvent);
            eventEmitter.off("socket_connection_open", onOpen);
        },
    };
}
