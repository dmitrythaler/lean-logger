### lean-logger
Dead simple, configurable node.js json logging
TBD...

env variables recognized in the following forms, "-" sign to deactivate, "+"(or nothing) vice versa
  LOG=* | LOG=all           <-- all channels active, it's default, no need to do so
  LOG=*,+debug | LOG=debug  <-- all default channels and debug
  LOG=-info,-warn,+http     <-- default channels without info and warn plus http channel
  LOG=warn+                 <-- "+" suffix: set lowest severity level >= warn
  LOG=module:*              <-- useful to create debug loggers starting with "module:"
