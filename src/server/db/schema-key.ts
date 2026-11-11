// Generated metadata has the same values in separately bundled routes, unlike
// the identity of their PrismaClient constructors.
export function prismaSchemaKey(metadata: Record<string, unknown>) {
  return JSON.stringify(
    Object.entries(metadata)
      .filter(
        ([name]) =>
          name === 'ModelName' || name === 'prismaVersion' || name.endsWith('ScalarFieldEnum'),
      )
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}
