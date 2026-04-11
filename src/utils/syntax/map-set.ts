
export function getOrInsertFromMap<T extends Map<any, any>, K extends T extends Map<infer K, any> ? K : never, V extends T extends Map<any, infer V> ? V : never>(map: T, key: K, defaultValue: V): V
{
  if (map.has(key))
  {
    return map.get(key)!;
  }
  const value = defaultValue;
  map.set(key, value);
  return value;
}

export function getOrInsertComputedFromMap<T extends Map<any, any>, K extends T extends Map<infer K, any> ? K : never, V extends T extends Map<any, infer V> ? V : never>(map: T, key: K, defaultValue: () => V): V
{
  if (map.has(key))
  {
    return map.get(key)!;
  }
  const value = defaultValue();
  map.set(key, value);
  return value;
}

