1 프로젝트명
 - geomartian 은 화성을 정복해 보고 싶어서

2 디렉토리
 - 3d_data 			: f4d 데이터가 저장됨
 - build 			: gulp를 이용해서 project를 build 하면 자동 생성되는 디렉토리.... git ignore
   build/js 		: javascript 파일을 압축 혹은 통합한 min 파일이 저장되는
   build/css 		: 확장성 고려해서 남겨둠
   build/doc 		: jsdoc으로 자동 생성
 - external			: 외부 javascript library를 저장
   external/jasime	: jasmine 테스트 라이브러리
 - example 			: 우리 프로젝트 사용예제들을 저장
 - images 			: 이미지
 - node_modules 	: node package......... git ignore
 - src				: 소스 저장
   src/css			: css 소스
   src/js			: javascript 소스
   src/js/cesium	: cesium custmizing 소스
 - test				: 테스트 소스..... jasmine은 spec 이란 이름을 사용하지만... 범용적으로 테스트라고 함


2 개발환경
 - java8
 - eclipse neon(필수)
 - node
 