import fetch from "isomorphic-unfetch";

import type { EthereumNetwork, GasPrice } from "../types";
import { getAsapGasPriceLevel } from "../getAsapGasPriceLevel";

// Note this API is rate limited if no API key is passed, we allow callers to pass theirs
// More info at https://docs.etherscan.io/support/rate-limits
export const GAS_STATION_URL_BY_NETWORK: Record<EthereumNetwork, string> = {
  ethereum: "https://api.etherscan.io/api?module=gastracker&action=gasoracle",
  goerli:
    "https://api-goerli.etherscan.io/api?module=gastracker&action=gasoracle",
  sepolia:
    "https://api-sepolia.etherscan.io/api?module=gastracker&action=gasoracle",
  rinkeby:
    "https://api-rinkeby.etherscan.io/api?module=gastracker&action=gasoracle",
};

export const DEFAULT_FALLBACK_GAS_PRICE = 80;

interface ResponseEthereumGasPrice {
  result: {
    LastBlock: number;
    suggestBaseFee: number;
    SafeGasPrice: number;
    ProposeGasPrice: number;
    FastGasPrice: number;
  };
}

interface EthereumOptions {
  apiKey?: string;
  fallbackGasPrice?: number | (() => Promise<number>);
}

export async function getEthereumGasPrice(
  network: EthereumNetwork,
  options: EthereumOptions = {}
): Promise<GasPrice> {
  const { apiKey, fallbackGasPrice = DEFAULT_FALLBACK_GAS_PRICE } = options;

  try {
    const gasStationUrl = GAS_STATION_URL_BY_NETWORK[network];

    const responseEthereumGasPrice = await fetch(
      apiKey !== undefined ? `${gasStationUrl}&apiKey=${apiKey}` : gasStationUrl
    )
      .then((response) => {
        return response.json();
      })
      .then<ResponseEthereumGasPrice>((response) => {
        if (response.status === "0") {
          throw new Error(response.result);
        }

        return {
          result: {
            LastBlock: response.result.LastBlock,
            suggestBaseFee: parseFloat(response.result.suggestBaseFee),
            SafeGasPrice: parseFloat(response.result.SafeGasPrice),
            ProposeGasPrice: parseFloat(response.result.ProposeGasPrice),
            FastGasPrice: parseFloat(response.result.FastGasPrice),
          },
        };
      });

    const lowMaxPriorityFee =
      responseEthereumGasPrice.result.SafeGasPrice -
      responseEthereumGasPrice.result.suggestBaseFee;

    const averageMaxPriorityFee =
      responseEthereumGasPrice.result.ProposeGasPrice -
      responseEthereumGasPrice.result.suggestBaseFee;

    const fastMaxPriorityFee =
      responseEthereumGasPrice.result.FastGasPrice -
      responseEthereumGasPrice.result.suggestBaseFee;

    const asapGasPriceLevel = getAsapGasPriceLevel(
      responseEthereumGasPrice.result.suggestBaseFee,
      fastMaxPriorityFee
    );

    return {
      LastBlock: responseEthereumGasPrice.result.LastBlock,
      low: {
        maxPriorityFeePerGas: lowMaxPriorityFee,
        maxFeePerGas: responseEthereumGasPrice.result.SafeGasPrice,
      },
      average: {
        maxPriorityFeePerGas: averageMaxPriorityFee,
        maxFeePerGas: responseEthereumGasPrice.result.ProposeGasPrice,
      },
      high: {
        maxPriorityFeePerGas: fastMaxPriorityFee,
        maxFeePerGas: responseEthereumGasPrice.result.FastGasPrice,
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
