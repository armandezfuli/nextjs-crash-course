"use client"

import posthog from "posthog-js"

export default function TestButton() {
    return (
        <button
            onClick={() => {
                posthog.capture("test_event")
            }}>
            Test
        </button>
    )
}
