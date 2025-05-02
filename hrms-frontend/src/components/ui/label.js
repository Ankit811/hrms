import * as React from "react"

export const Label = React.forwardRef(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={`mb-2 block text-sm font-medium text-gray-700 ${className}`}
    {...props}
  />
))
Label.displayName = "Label"
