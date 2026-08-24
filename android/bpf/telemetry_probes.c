#include <uapi/linux/ptrace.h>
#include <linux/sched.h>

// AI Secure Space - eBPF Kernel Probe Definition
// Compiles to BPF bytecode via LLVM/Clang and loaded into the Android kernel.

BPF_PERF_OUTPUT(telemetry_events);

struct security_event_t {
    u64 ts;
    u32 pid;
    u32 uid;
    char comm[16];
    u32 syscall_type; // 1=execve, 2=ptrace, 3=mprotect, 4=bind
    u64 arg_monitor;
};

// 1. execve hook (Process execution tracking)
int kprobe__sys_execve(struct pt_regs *ctx, const char __user *filename) {
    struct security_event_t event = {};
    event.ts = bpf_ktime_get_ns();
    event.pid = bpf_get_current_pid_tgid() >> 32;
    event.uid = bpf_get_current_uid_gid() & 0xFFFFFFFF;
    bpf_get_current_comm(&event.comm, sizeof(event.comm));
    event.syscall_type = 1;
    telemetry_events.perf_submit(ctx, &event, sizeof(event));
    return 0;
}

// 2. ptrace hook (Anti-Debugging / Memory Read-Write Detection)
int kprobe__sys_ptrace(struct pt_regs *ctx, long request, long pid) {
    struct security_event_t event = {};
    event.ts = bpf_ktime_get_ns();
    event.pid = bpf_get_current_pid_tgid() >> 32;
    event.uid = bpf_get_current_uid_gid() & 0xFFFFFFFF;
    bpf_get_current_comm(&event.comm, sizeof(event.comm));
    event.syscall_type = 2;
    event.arg_monitor = request; // PTRACE_ATTACH, PTRACE_PEEKTEXT, etc.
    telemetry_events.perf_submit(ctx, &event, sizeof(event));
    return 0;
}

// 3. mprotect hook (W^X violation detection - PROT_READ|PROT_WRITE|PROT_EXEC)
int kprobe__sys_mprotect(struct pt_regs *ctx, unsigned long start, size_t len, unsigned long prot) {
    struct security_event_t event = {};
    event.ts = bpf_ktime_get_ns();
    event.pid = bpf_get_current_pid_tgid() >> 32;
    event.uid = bpf_get_current_uid_gid() & 0xFFFFFFFF;
    bpf_get_current_comm(&event.comm, sizeof(event.comm));
    
    // Check for PROT_EXEC (4) | PROT_WRITE (2) | PROT_READ (1) == 7
    if (prot == 7) {
        event.syscall_type = 3;
        event.arg_monitor = prot;
        telemetry_events.perf_submit(ctx, &event, sizeof(event));
    }
    return 0;
}

// 4. bind hook (Suspicious socket bindings)
int kprobe__sys_bind(struct pt_regs *ctx, int fd, struct sockaddr __user *umyaddr, int addrlen) {
    struct security_event_t event = {};
    event.ts = bpf_ktime_get_ns();
    event.pid = bpf_get_current_pid_tgid() >> 32;
    event.uid = bpf_get_current_uid_gid() & 0xFFFFFFFF;
    bpf_get_current_comm(&event.comm, sizeof(event.comm));
    event.syscall_type = 4;
    telemetry_events.perf_submit(ctx, &event, sizeof(event));
    return 0;
}
