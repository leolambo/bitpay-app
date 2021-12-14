import React, {ReactElement} from 'react';
import {Dimensions} from 'react-native';
import {Carousel} from 'react-native-snap-carousel';
import styled from 'styled-components/native';
import haptic from '../haptic-feedback/haptic';
import ExchangeRateCard from './ExchangeRateCard';

export interface ExchangeRateProps {
  id: number;
  img: ReactElement | undefined;
  coinName?: string;
  average?: number;
}

interface ExchangeRateSlide {
  items: Array<ExchangeRateProps>;
}

const WIDTH = Dimensions.get('window').width;

const ExchangeRatesContainer = styled.View`
  flex: 1;
  margin-top: 10px;
  min-height: 91px;
`;

const ExchangeRatesSlides = ({items}: ExchangeRateSlide) => {
  return (
    <ExchangeRatesContainer>
      <Carousel
        vertical={false}
        layout={'default'}
        useExperimentalSnap={true}
        data={items}
        renderItem={ExchangeRateCard}
        sliderWidth={WIDTH}
        itemWidth={110}
        inactiveSlideScale={1}
        inactiveSlideOpacity={1}
        onScrollIndexChanged={() => {
          haptic('impactLight');
        }}
      />
    </ExchangeRatesContainer>
  );
};

export default ExchangeRatesSlides;