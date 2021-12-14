import React, {useCallback, useEffect, useRef} from 'react';
import styled, {css} from 'styled-components/native';
import {Platform, ScrollView} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {purchasedBrands} from './stubs/gift-cards';
import {HEIGHT} from '../../../components/styled/Containers';
import GiftCardCatalog from './components/GiftCardCatalog';
import {
  getCardConfigFromApiConfigMap,
  getGiftCardCurations,
} from '../../../lib/gift-cards/gift-card';
import {useDispatch, useSelector} from 'react-redux';
import {startFetchCatalog} from '../../../store/shop/shop.effects';
import {RootState} from '../../../store';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import {ScreenOptions} from '../../../styles/tabNavigator';

const Tab = createMaterialTopTabNavigator();

const ShopContainer = styled.View`
  flex: 1;
`;

const ShopHeader = styled.Text`
  font-size: 18px;
  font-weight: 700;
  margin-top: ${Platform.select({
    ios: css`
      20px
    `,
    android: css`
      40px
    `,
  })};
  text-align: center;
  margin-bottom: 40px;
`;

const ShopOnline = () => {
  return <></>;
};

const ShopHome = () => {
  const availableCardMap = useSelector(
    ({SHOP}: RootState) => SHOP.availableCardMap,
  );
  const directory = useSelector(({SHOP}: RootState) => SHOP.categories);
  const availableGiftCards = getCardConfigFromApiConfigMap(availableCardMap);
  const curations = getGiftCardCurations(availableGiftCards, directory);
  const scrollViewRef = useRef<ScrollView>(null);
  const categories = Object.values(directory.categories) as any[];
  const purchasedBrandsHeight = purchasedBrands.length * 68 + 260;
  const curationsHeight = curations.length * 320;
  const categoriesHeight = categories.length * 70;
  const searchBarHeight = 150;
  const scrollViewHeight =
    purchasedBrandsHeight +
    curationsHeight +
    categoriesHeight +
    searchBarHeight;

  const memoizedGiftCardCatalog = useCallback(
    () => (
      <GiftCardCatalog
        scrollViewRef={scrollViewRef}
        availableGiftCards={availableGiftCards}
        curations={curations}
        categories={categories}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [availableGiftCards, categories, curations].map(obj => JSON.stringify(obj)),
  );

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(startFetchCatalog());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const insets = useSafeAreaInsets();

  return (
    <ShopContainer
      style={{
        paddingTop: insets.top,
        paddingBottom: 0,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}>
      <ScrollView
        contentContainerStyle={{
          height: scrollViewHeight,
          minHeight: HEIGHT,
        }}
        ref={scrollViewRef}
        keyboardDismissMode="on-drag">
        <ShopHeader>Shop with Crypto</ShopHeader>
        <Tab.Navigator screenOptions={ScreenOptions(112)}>
          <Tab.Screen name="Gift Cards" component={memoizedGiftCardCatalog} />
          <Tab.Screen name="Shop Online" component={ShopOnline} />
        </Tab.Navigator>
      </ScrollView>
    </ShopContainer>
  );
};

export default ShopHome;