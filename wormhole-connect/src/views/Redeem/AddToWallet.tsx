import { Link, Typography } from '@mui/material';
import {
  coalesceChainId,
  isEVMChain,
} from '@xlabs-libs/wallet-aggregator-core';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';
import {
  CHAINS,
  TESTNET_TO_MAINNET_CHAIN_NAMES,
  TOKENS,
  isMainnet,
} from '../../config';
import { MAINNET_NETWORKS } from '../../config/mainnet';
import TokenIcon from '../../icons/TokenIcons';
import { getForeignAsset, wh } from '../../sdk';
import { RootState } from '../../store';
import { setWalletModal } from '../../store/router';
import { getWrappedToken } from '../../utils';
import { TransferWallet, switchNetwork, watchAsset } from '../../utils/wallet';
import { TokenConfig } from '../../config/types';
import ExplorerLink from './ExplorerLink';
import {
  ChainName,
  SuiContext,
  WormholeContext,
} from '@wormhole-foundation/wormhole-connect-sdk';

const useStyles = makeStyles()((theme) => ({
  addToken: {
    display: 'flex',
    alignItems: 'center',
    marginTop: '8px',
    flexDirection: 'row',
  },
  addTokenText: {
    marginLeft: '8px',
  },
  addTokenLink: {
    textDecoration: 'underline',
  },
}));

interface AddTokenProps {
  token: TokenConfig;
  address: string;
}

function AddToEVMWallet({ token, address }: AddTokenProps) {
  const dispatch = useDispatch();
  const { classes } = useStyles();

  const txData = useSelector((state: RootState) => state.redeem.txData)!;
  const receiverWallet = useSelector(
    (state: RootState) => state.wallet[TransferWallet.RECEIVING],
  );

  const addToWallet = async () => {
    if (!receiverWallet || !receiverWallet.address) {
      dispatch(setWalletModal(TransferWallet.RECEIVING));
      return;
    }

    // when using the automatic relay method the user may still have their wallet
    // configured to the source chain instead of the destination chain
    const evmChainId = CHAINS[txData.toChain]?.chainId;
    if (!evmChainId) return;
    await switchNetwork(evmChainId, TransferWallet.RECEIVING);

    await watchAsset(
      {
        address: address,
        symbol: token.symbol,
        decimals: token.decimals,
        // evm chain id
        chainId: CHAINS[token.nativeNetwork]?.chainId,
      },
      TransferWallet.RECEIVING,
    );
  };

  return (
    <Link onClick={addToWallet} href="#" className={classes.addTokenLink}>
      <Typography component={'span'} gap={1} className={classes.addToken}>
        <TokenIcon height={20} name={token.icon} />
        Add {token.symbol} to your wallet
      </Typography>
    </Link>
  );
}

function AddToSolanaWallet({ token, address }: AddTokenProps) {
  const { classes } = useStyles();

  return (
    <Typography component={'span'} className={classes.addToken}>
      <TokenIcon height={20} name={token.icon} />
      <span className={classes.addTokenText}>See {token.symbol} token on</span>
      <ExplorerLink
        styles={{ marginLeft: -4 }}
        network={'solana'}
        type={'address'}
        address={address}
      />
    </Typography>
  );
}

function AddToSuiWallet({ token, address }: AddTokenProps) {
  const { classes } = useStyles();

  // display the token's metadata object ID for Sui
  return (
    <Typography component={'span'} className={classes.addToken}>
      <TokenIcon height={20} name={token.icon} />
      <span className={classes.addTokenText}>See {token.symbol} token on</span>
      <ExplorerLink
        styles={{ marginLeft: -4 }}
        network={'sui'}
        type={'object'}
        object={address}
      />
    </Typography>
  );
}

function AddToAptosWallet({ token, address }: AddTokenProps) {
  const { classes } = useStyles();

  const tokenAccount = address.split('::')[0];
  return (
    <Typography component={'span'} className={classes.addToken}>
      <TokenIcon height={20} name={token.icon} />
      <span className={classes.addTokenText}>See {token.symbol} token on</span>
      <ExplorerLink
        styles={{ marginLeft: -4 }}
        network={'aptos'}
        type={'address'}
        address={tokenAccount}
      />
    </Typography>
  );
}

function AddToWallet() {
  const txData = useSelector((state: RootState) => state.redeem.txData)!;

  const [targetToken, setTargetToken] = useState<TokenConfig | undefined>(
    undefined,
  );
  const [targetAddress, setTargetAddress] = useState<string | null | undefined>(
    undefined,
  );

  useEffect(() => {
    const fetchTokenInfo = async () => {
      const tokenInfo = TOKENS[txData.tokenKey];
      const wrapped = getWrappedToken(tokenInfo);
      if (!wrapped.tokenId) return;
      const address = await getForeignAsset(wrapped.tokenId, txData.toChain);

      if (txData.toChain === 'sui' && address) {
        const context = wh.getContext('sui') as SuiContext<WormholeContext>;
        const metadata = await context.provider.getCoinMetadata({
          coinType: address,
        });
        setTargetAddress(metadata?.id);
        setTargetToken(wrapped);
        return;
      }

      setTargetAddress(address);
      setTargetToken(wrapped);
    };

    fetchTokenInfo().catch((err) =>
      console.error('Failed to fetch token info', err),
    );
  }, [txData]);

  const chainName = isMainnet
    ? (txData.toChain as ChainName)
    : TESTNET_TO_MAINNET_CHAIN_NAMES[txData.toChain];
  const chainId = coalesceChainId(chainName);

  if (!targetToken || !targetAddress) return <></>;

  if (isEVMChain(chainId)) {
    return <AddToEVMWallet address={targetAddress} token={targetToken} />;
  } else if (
    chainId === MAINNET_NETWORKS.solana?.id &&
    targetToken.symbol !== 'WSOL'
  ) {
    return <AddToSolanaWallet address={targetAddress} token={targetToken} />;
  } else if (chainId === MAINNET_NETWORKS.sui?.id) {
    return <AddToSuiWallet address={targetAddress} token={targetToken} />;
  } else if (
    chainId === MAINNET_NETWORKS.aptos?.id &&
    targetToken.symbol !== 'APT'
  ) {
    return <AddToAptosWallet address={targetAddress} token={targetToken} />;
  }

  return <></>;
}

export default AddToWallet;
