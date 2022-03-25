import axios from 'axios';
import {ShopActions} from '.';
import {Effect} from '..';
import BitPayIdApi from '../../api/bitpay';
import {APP_NETWORK, BASE_BITPAY_URLS} from '../../constants/config';
import {getCountry} from '../../lib/location/location';
import {
  CardConfig,
  GiftCard,
  GiftCardInvoiceParams,
  GiftCardOrder,
  Invoice,
  UnsoldGiftCard,
} from './shop.models';

export const startFetchCatalog = (): Effect => async (dispatch, getState) => {
  try {
    const {APP, BITPAY_ID} = getState();
    const baseUrl = BASE_BITPAY_URLS[APP_NETWORK];
    const user = BITPAY_ID.user[APP.network];
    const incentiveLevelId = user?.incentiveLevelId;
    const [catalogResponse, directoryResponse, integrationsResponse] =
      await Promise.all([
        getCountry().then(country =>
          axios.get(
            `${baseUrl}/gift-cards/catalog/${country}${
              incentiveLevelId && user.localSettings.syncGiftCardPurchases
                ? `/${incentiveLevelId}`
                : ''
            }`,
          ),
        ),
        axios.get(`${baseUrl}/merchant-directory/directory`),
        axios.get(`${baseUrl}/merchant-directory/integrations`),
      ]);
    const {data: availableCardMap} = catalogResponse;
    const {data: categoriesAndCurations} = directoryResponse;
    const {data: integrations} = integrationsResponse;
    dispatch(
      ShopActions.successFetchCatalog({
        availableCardMap,
        categoriesAndCurations,
        integrations,
      }),
    );
  } catch (err) {
    console.error(err);
    dispatch(ShopActions.failedFetchCatalog());
  }
};

export const startCreateGiftCardInvoice =
  (
    cardConfig: CardConfig,
    params: GiftCardInvoiceParams,
  ): Effect<Promise<GiftCardOrder>> =>
  async (dispatch, getState) => {
    try {
      const {BITPAY_ID, SHOP} = getState();
      const baseUrl = BASE_BITPAY_URLS[APP_NETWORK];
      const user = BITPAY_ID.user[APP_NETWORK];
      const shouldSync = user?.localSettings.syncGiftCardPurchases;
      const fullParams = {
        ...params,
        ...(cardConfig.emailRequired && {
          email: shouldSync ? user?.email : SHOP.email,
        }),
        ...(cardConfig.phoneRequired && {phone: SHOP.phone}),
      };
      const createInvoiceResponse = shouldSync
        ? await BitPayIdApi.getInstance()
            .request(
              'createGiftCardInvoice',
              BITPAY_ID.apiToken[APP_NETWORK],
              fullParams,
            )
            .then(res => {
              if (res?.data?.error) {
                throw new Error(res.data.error);
              }
              return res.data;
            })
        : await axios.post(`${baseUrl}/gift-cards/pay`, fullParams);
      const {data: cardOrder} = createInvoiceResponse as {data: GiftCardOrder};
      const getInvoiceResponse = await axios.get(
        `${baseUrl}/invoices/${cardOrder.invoiceId}`,
      );
      const {
        data: {data: invoice},
      } = getInvoiceResponse as {data: {data: Invoice}};
      const unsoldGiftCard = {
        currency: params.currency,
        date: new Date(),
        amount: params.amount,
        clientId: params.clientId,
        accessKey: cardOrder.accessKey,
        invoiceId: cardOrder.invoiceId,
        name: params.brand,
        totalDiscount: cardOrder.totalDiscount,
        invoice: invoice,
        status: 'UNREDEEMED',
        ...(user && user.eid && {userEid: user.eid}),
      } as UnsoldGiftCard;
      dispatch(
        ShopActions.initializedUnsoldGiftCard({
          giftCard: unsoldGiftCard,
        }),
      );
      return {...cardOrder, invoice} as GiftCardOrder;
    } catch (err) {
      console.error(err);
      dispatch(ShopActions.failedCreateGiftCardInvoice());
      throw err;
    }
  };

export const startRedeemGiftCard =
  (invoiceId: string): Effect<Promise<GiftCard>> =>
  async (dispatch, getState) => {
    const {SHOP} = getState();
    const unredeemedGiftCard = SHOP.giftCards[APP_NETWORK].find(
      card => card.invoiceId === invoiceId,
    ) as UnsoldGiftCard;
    const baseUrl = BASE_BITPAY_URLS[APP_NETWORK];
    const redeemResponse = await axios
      .post(`${baseUrl}/gift-cards/redeem`, {
        accessKey: unredeemedGiftCard.accessKey,
        clientId: unredeemedGiftCard.clientId,
        invoiceId: unredeemedGiftCard.invoiceId,
      })
      .catch(err => {
        const errMessage = err.response?.data?.message;
        const pendingMessages = [
          'Card creation delayed',
          'Invoice is unpaid or payment has not confirmed',
        ];
        const isDelayed =
          pendingMessages.includes(errMessage) ||
          errMessage.indexOf('Please wait') !== -1;
        return {
          data: {
            status: isDelayed ? 'PENDING' : 'FAILURE',
          },
        };
      });
    const {data: giftCard} = redeemResponse;
    const updatedGiftCard = {
      ...unredeemedGiftCard,
      ...giftCard,
      status: giftCard.status || 'SUCCESS',
    } as GiftCard;
    dispatch(ShopActions.redeemedGiftCard({giftCard: updatedGiftCard}));
    return updatedGiftCard;
  };
