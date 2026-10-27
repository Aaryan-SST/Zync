/**
 * Generic factory middleware that validates req.body (and optionally req.params or req.query)
 * against a Zod schema.
 *
 * On validation failure:
 *   HTTP 400 { message: "Validation failed", errors: [{ field, message }] }
 *
 * On success:
 *   Replaces req.body (or params/query) with the parsed/coerced data, then calls next().
 */
export function validate(schema, options = {}) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => {
        let field = "_body";
        if (issue.path.length > 0) {
          field = issue.path.join(".");
        } else if (issue.keys && issue.keys.length > 0) {
          field = issue.keys.join(", ");
        }
        return {
          field,
          message: issue.message,
        };
      });

      return res.status(400).json({
        message: "Validation failed",
        errors,
      });
    }

    // Replace req.body with the sanitized/coerced value
    req.body = result.data;

    // Optional params validation
    if (options.params) {
      const paramsResult = options.params.safeParse(req.params);
      if (!paramsResult.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: paramsResult.error.issues.map((i) => ({
            field: i.path.join(".") || "param",
            message: i.message,
          })),
        });
      }
      req.params = paramsResult.data;
    }

    // Optional query validation
    if (options.query) {
      const queryResult = options.query.safeParse(req.query);
      if (!queryResult.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: queryResult.error.issues.map((i) => ({
            field: i.path.join(".") || "query",
            message: i.message,
          })),
        });
      }
      req.query = queryResult.data;
    }

    next();
  };
}
