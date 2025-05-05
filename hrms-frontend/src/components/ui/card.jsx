import * as React from "react"

export const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`rounded-xl border bg-white text-black shadow ${className}`}
    {...props}
  />
))
Card.displayName = "Card"

export const CardHeader = ({ className, ...props }) => (
  <div className={`p-4 border-b font-semibold text-lg ${className}`} {...props} />
)

export const CardContent = ({ className, ...props }) => (
  <div className={`p-4 ${className}`} {...props} />
)

export const CardFooter = ({ className, ...props }) => (
  <div className={`p-4 border-t ${className}`} {...props} />
)

export function CardTitle({ children, className }) {
    return <h2 className={`text-xl font-semibold ${className}`}>{children}</h2>;
}
  
