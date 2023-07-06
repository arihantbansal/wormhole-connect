import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BigNumber } from 'ethers';
import { ChainName } from '@wormhole-foundation/wormhole-connect-sdk';
import { RootState } from '../../../store';
import {
  setBalance as setStoreBalance,
  formatBalance,
  setToken,
  selectFromNetwork,
  setAmount,
  setReceiveAmount,
} from '../../../store/transferInput';
import { CHAINS_ARR, TOKENS } from '../../../config';
import { wh } from '../../../utils/sdk';
import { TransferWallet, walletAcceptedNetworks } from '../../../utils/wallet';
import Operator from '../../../utils/routes';

import Inputs from './Inputs';
import Select from './Select';
import AmountInput from './AmountInput';
import TokensModal from '../../../components/TokensModal';
import NetworksModal from '../../../components/NetworksModal';

function FromInputs() {
  const dispatch = useDispatch();
  const [balance, setBalance] = useState(undefined as string | undefined);
  const [showTokensModal, setShowTokensModal] = useState(false);
  const [showNetworksModal, setShowNetworksModal] = useState(false);

  const { toNativeToken } = useSelector((state: RootState) => state.relay);
  const wallet = useSelector((state: RootState) => state.wallet.sending);
  const {
    validate: showErrors,
    validations,
    route,
    fromNetwork,
    toNetwork,
    token,
    amount,
    isTransactionInProgress,
  } = useSelector((state: RootState) => state.transferInput);
  const tokenConfig = token && TOKENS[token];

  const isDisabled = (chain: ChainName) => {
    // Check if the wallet type (i.e. Metamask, Phantom...) is supported for the given chain
    return !walletAcceptedNetworks(wallet.type).includes(chain);
  };

  const selectNetwork = async (network: ChainName) => {
    selectFromNetwork(dispatch, network, wallet);
  };

  const selectToken = (token: string) => {
    dispatch(setToken(token));
  };

  // balance
  useEffect(() => {
    if (!fromNetwork || !tokenConfig || !wallet.address) {
      return setBalance(undefined);
    }
    if (tokenConfig.tokenId) {
      wh.getTokenBalance(wallet.address, tokenConfig.tokenId, fromNetwork).then(
        (res: BigNumber | null) => {
          const balance = formatBalance(fromNetwork, tokenConfig, res);
          setBalance(balance[tokenConfig.key] || undefined);
          dispatch(setStoreBalance(balance));
        },
      );
    } else {
      wh.getNativeBalance(wallet.address, fromNetwork).then(
        (res: BigNumber) => {
          const balance = formatBalance(fromNetwork, tokenConfig, res);
          setBalance(balance[tokenConfig.key] || undefined);
          dispatch(setStoreBalance(balance));
        },
      );
    }
  }, [tokenConfig, fromNetwork, wallet.address, dispatch]);

  // token input jsx
  const selectedToken = tokenConfig
    ? { icon: tokenConfig.icon, text: tokenConfig.symbol }
    : undefined;
  const tokenInput = (
    <Select
      label="Asset"
      selected={selectedToken}
      error={!!(showErrors && validations.token)}
      onClick={() => setShowTokensModal(true)}
      disabled={!fromNetwork || !wallet.address || isTransactionInProgress}
      editable
    />
  );

  // TODO: clean up the send/receive amount set logic
  const handleAmountChange = useCallback(async (amount: string) => {
    dispatch(setAmount(amount));
    const r = new Operator();
    const receiveAmount = await r.computeReceiveAmount(
      route,
      Number.parseFloat(amount),
      { toNativeToken },
    );
    dispatch(setReceiveAmount(`${receiveAmount}`));
  }, [ route, toNativeToken ]);
  const amountInput = (
    <AmountInput handleAmountChange={handleAmountChange} value={amount} />
  );

  return (
    <>
      <Inputs
        title="From"
        wallet={TransferWallet.SENDING}
        walletValidations={[validations.sendingWallet]}
        walletError={wallet.error}
        inputValidations={[
          validations.fromNetwork,
          validations.token,
          validations.amount,
        ]}
        network={fromNetwork}
        networkValidation={validations.fromNetwork}
        onNetworkClick={() => setShowNetworksModal(true)}
        tokenInput={tokenInput}
        amountInput={amountInput}
        balance={balance}
      />
      <TokensModal
        open={showTokensModal}
        network={fromNetwork}
        walletAddress={wallet.address}
        type="source"
        onSelect={selectToken}
        onClose={() => setShowTokensModal(false)}
      />
      <NetworksModal
        open={showNetworksModal}
        title="Sending to"
        chains={CHAINS_ARR.filter((c) => c.key !== toNetwork)}
        onSelect={selectNetwork}
        onClose={() => setShowNetworksModal(false)}
        isDisabled={isDisabled}
      />
    </>
  );
}

export default FromInputs;
