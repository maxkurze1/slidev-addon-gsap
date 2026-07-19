import { type ShallowRef } from "vue"

export type ProxyRefApi<T extends object> = T & {
  value: T | null;
  ref: ShallowRef<T | null>;
  isReady: boolean;
};

export function createRefProxy<T extends object>(
  source: ShallowRef<T | null>,
  label: string,
): ProxyRefApi<T> {
  return new Proxy({} as ProxyRefApi<T>, {
    get(_target, prop) {
      if (prop === "value") return source.value;
      if (prop === "ref") return source;
      if (prop === "isReady") return source.value !== null;

      if (!source.value)
        throw new Error(`${label} is not ready yet. Access it inside onMounted / onSlideEnter.`);

      const value = (source.value as any)[prop];
      return typeof value === "function" ? value.bind(source.value) : value;
    },
    set(_target, prop, value) {
      if (prop === "value") {
        source.value = value;
        return true;
      }

      if (!source.value)
        throw new Error(`${label} is not ready yet. Access it inside onMounted / onSlideEnter.`);

      (source.value as any)[prop] = value;
      return true;
    },
    has(_target, prop) {
      if (prop === "value" || prop === "ref" || prop === "isReady") return true;
      return source.value ? prop in source.value : false;
    },
    ownKeys() {
      if (!source.value) return ["value", "ref", "isReady"];
      return Reflect.ownKeys(source.value as any);
    },
    getOwnPropertyDescriptor(_target, prop) {
      if (prop === "value" || prop === "ref" || prop === "isReady") {
        return { enumerable: true, configurable: true };
      }
      if (!source.value) return undefined;
      return Object.getOwnPropertyDescriptor(source.value as any, prop);
    },
    getPrototypeOf() {
      return source.value ? Object.getPrototypeOf(source.value) : Object.prototype;
    },
  });
}
