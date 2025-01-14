export type EthereumNetwork = "ethereum" | "goerli" | "sepolia" | "rinkeby";
export type PolygonNetwork = "polygon" | "mumbai";

export type Network = EthereumNetwork | PolygonNetwork;

export interface GasPriceLevel {
  maxPriorityFeePerGas: number;
  maxFeePerGas: number;
}

export interface GasPrice {
  LastBlock: number | null;
  low: GasPriceLevel;
  average: GasPriceLevel;
  high: GasPriceLevel;
  asap: GasPriceLevel;
}

export interface Options {
  etherscanApiKey?: string;
  fallbackGasPrice?: Partial<Record<Network, number | (() => Promise<number>)>>;
}
