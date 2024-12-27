declare type Address = string;
declare type ChainName = string;

declare module '*.yaml' {
  const data: any;
  export default data;
}
