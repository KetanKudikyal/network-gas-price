import fetch from "isomorphic-unfetch";

import type { GasPrice, PolygonNetwork } from "../types";
import { getAsapGasPriceLevel } from "../getAsapGasPriceLevel";

export const GAS_STATION_URL_BY_NETWORK: Record<PolygonNetwork, string> = {
  polygon: "https://gasstation.polygon.technology/v2",
  mumbai: "https://gasstation-testnet.polygon.technology/v2",
};

export const DEFAULT_FALLBACK_GAS_PRICE = 50;

interface ResponsePolygonGasPrice {
  blockNumber: number | null;
  estimatedBaseFee: number;
  safeLow: {
    maxPriorityFee: number;
    maxFee: number;
  };
  standard: {
    maxPriorityFee: number;
    maxFee: number;
  };
  fast: {
    maxPriorityFee: number;
    maxFee: number;
  };
}

interface PolygonOptions {
  fallbackGasPrice?: number | (() => Promise<number>);
}

export async function getPolygonGasPrice(
  network: PolygonNetwork,
  options: PolygonOptions = {}
): Promise<GasPrice> {
  const { fallbackGasPrice = DEFAULT_FALLBACK_GAS_PRICE } = options;

  try {
    const gasStationUrl = GAS_STATION_URL_BY_NETWORK[network];

    const responsePolygonGasPrice = await fetch(
      gasStationUrl
    ).then<ResponsePolygonGasPrice>((response) => {
      return response.json();
    });

    const asapGasPriceLevel = getAsapGasPriceLevel(
      responsePolygonGasPrice.estimatedBaseFee,
      responsePolygonGasPrice.fast.maxPriorityFee
    );

    return {
      LastBlock: responsePolygonGasPrice.blockNumber,
      low: {
        maxPriorityFeePerGas: responsePolygonGasPrice.safeLow.maxPriorityFee,
        maxFeePerGas: responsePolygonGasPrice.safeLow.maxFee,
      },
      average: {
        maxPriorityFeePerGas: responsePolygonGasPrice.standard.maxPriorityFee,
        maxFeePerGas: responsePolygonGasPrice.standard.maxFee,
      },
      high: {
        maxPriorityFeePerGas: responsePolygonGasPrice.fast.maxPriorityFee,
        maxFeePerGas: responsePolygonGasPrice.fast.maxFee,
      },
      asap: asapGasPriceLevel,
    };
  } catch (error) {
    const gasPrice =
      typeof fallbackGasPrice === "function"
        ? await fallbackGasPrice()
        : fallbackGasPrice;

    return {
      LastBlock: null,
      low: {
        maxPriorityFeePerGas: gasPrice,
        maxFeePerGas: gasPrice,
      },
      average: {
        maxPriorityFeePerGas: gasPrice,
        maxFeePerGas: gasPrice,
      },
      high: {
        maxPriorityFeePerGas: gasPrice,
        maxFeePerGas: gasPrice,
      },
      asap: {
        maxPriorityFeePerGas: gasPrice,
        maxFeePerGas: gasPrice,
      },
    };
  }
}
